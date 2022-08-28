class Cluster {
    constructor() {
        this.regions = []; 

        this.ds = 0.1; // length of segments

        // computed:
        this.chains = [];
        this.nodes = [];
        this._perimeter = null;
    }

    clear_cache() {
        this._perimeter = null;
        this.regions.forEach(function(region){
            region._area = null;
            region._perimeter = null;
        });
        this.chains.forEach(function(chain) {
            chain._length = null;
            chain._area = null;
        });
    }

    perimeter() {
        if (this._perimeter == null) {
            var perimeter = 0.0;
            this.chains.forEach(chain => {
                perimeter += chain.length();
            });
            this._perimeter = perimeter;
        }
        return this._perimeter;
    }

    translate(v) {
        this.each_vertex(vertex => {
            vertex.add(v)
        });
    }

    each_vertex(f) {
        this.chains.forEach(function(chain) {
            for(var i=1; i<chain.vertices.length-1; ++i) {
                f(chain.vertices[i]);
            }
        });
        this.nodes.forEach(function(vertex) {
            f(vertex);
        });
    }

    compute_topology() {
        var self = this;

        function add_node(vertex) {
            if (!self.nodes.includes(vertex)) {
                self.nodes.push(vertex);
            }
        }

        function add_chain(chain) {
            if (!self.chains.includes(chain)) {
                self.chains.push(chain);
            }
            add_node(chain.vertex_start());
            add_node(chain.vertex_end());
        }

        this.chains.forEach(chain => {chain.signed_regions=[]})

        this.regions.forEach(function(region) {
            region.cluster = self;
            region.signed_chains.forEach(([sign, chain]) => {
                add_chain(chain)
                chain.signed_regions.push([sign, region])
            })
        });
    }

    region_containing(p) {
        this.regions.forEach(function(region) {
            if (region.is_inside(p)) return region;
        });
        return null;
    }

    clear_forces() {
        this.chains.forEach(function(chain) {
            chain.vertices.forEach(function(vertex) {
                vertex.force.x = 0.0;
                vertex.force.y = 0.0;
            });
        });
    }

    compute_forces() {
        this.clear_forces();

        this.chains.forEach(function(chain) {
            // var ds = chain.length() / (chain.vertices.length-1);
            // curvature
            for(var i=1; i<chain.vertices.length; ++i) {
                const v = chain.vertices[i-1];
                const w = chain.vertices[i];

                const fx = (w.x-v.x);
                const fy = (w.y-v.y);

                v.force.x += fx;
                v.force.y += fy;
                w.force.x -= fx;
                w.force.y -= fy;
            }
            
            if (true) {
                // pressure
                var p = 0.0;
                chain.signed_regions.forEach(([sign, region]) => {
                    p += sign * region.pressure
                })
                const n = chain.vertices.length;
                for (var i=1; i<n-1; ++i) {
                    const v = chain.vertices[i>0?i-1:i];
                    const z = chain.vertices[i];
                    const w = chain.vertices[i<n-1?i+1:i];
                    const fx = w.y-v.y;
                    const fy = v.x-w.x;
                    const l = Math.sqrt(Math.pow(fx,2) + Math.pow(fy,2));

                    z.force.x += p*fx/l;
                    z.force.y += p*fy/l;
                }
            }
        });
    }

    equalize() {
        this.chains.forEach(chain => {
            const n = chain.vertices.length-1;
            if (this.ds * (n+1) < chain.length()) {
                // add one more segment
                const k = Math.floor(Math.random()*(n-1));
                const v = chain.vertices[k]; // insert between this
                const w = chain.vertices[k+1]; // and this
                chain.vertices.splice(k+1, 0, new Vertex((v.x+w.x)/2, (v.y+w.y)/2));
            } else if (n>1 && this.ds * (n-1) > chain.length()) {
                const k = Math.floor(Math.random()*(n-1));
                chain.vertices.splice(k+1, 1);
            }
        });

    }

    evolve(dt) {
        this.regions.forEach(function(region){
            region.area_prev = region.area();
        });

        // move vertices along forces
        this.each_vertex(vertex => vertex.evolve(dt));

        this.clear_cache();

        // center
        var v = new Vec(Infinity, Infinity);
        var w = new Vec(-Infinity, -Infinity);
        this.each_vertex(vertex => {
            v.x = Math.min(v.x, vertex.x);
            v.y = Math.min(v.y, vertex.y);
            w.x = Math.max(w.x, vertex.x);
            w.y = Math.max(w.y, vertex.y);
        });
        v.add(w);
        v.div(2);
        this.each_vertex(vertex => vertex.sub(v));

        this.equalize();

        // update pressures
        this.regions.forEach(function (region) {
            region.pressure = (region.area_target - region.area())/region.area_target;
        });

        this.compute_forces();
    }

    add_chain(chain) {
        const cluster = this;
        if (chain.vertices.length <= 2) {
            console.log("too few vertices in chain");
            return;
        }
        function find_closest(p) {
            var best_d = Infinity;
            var best_chain = null;
            var best_i = null;
            cluster.chains.forEach(chain => {
                for(i=1; i<chain.vertices.length-1; ++i) {
                    const d = vec_distance(chain.vertices[i], p);
                    if (d < best_d) {
                        best_d = d;
                        best_chain = chain;
                        best_i = i;
                    }
                }
            });
            return {'d': best_d, 'chain': best_chain, 'i': best_i};
        }

        var new_region = null;
        if (this.regions.length == 0) {
            new_region = new Region();
            if (chain.area()<0) {
                chain.vertices.reverse();
            }
            chain.vertices.push(chain.vertices[0]); // closed curve
            new_region.signed_chains.push([1, chain])
            this.regions.push(new_region);
        } else {
            const start = find_closest(chain.vertex_end()); // sic: start <- end
            const end = find_closest(chain.vertex_start()); // sic: end <- start

            if (start.chain.has_negative_region()) {
                console.log("cannot find starting point external edge");
                return;    
            }

            if (end.chain.has_negative_region()) {
                console.log("cannot find ending point external edge");
                return;    
            }

            var chains = [start.chain];
            
            // follow the chains backward along the cluster boundary
            while(chains[chains.length-1] != end.chain) {
                var i;
                for (i=0;i<this.chains.length; ++i) {
                    if (this.chains[i].vertex_end() == chains[chains.length-1].vertex_start()
                        && !this.chains[i].has_negative_region()) break;
                }
                if (i == this.chains.length) {
                    console.log("unable to close path in external region");
                    return;
                }
                if (chains.includes(this.chains[i])) {
                    console.log("loop detected while searching for path");
                    return;
                }
                chains.push(this.chains[i]);
            }

            // we are ready to make the surgery!

            function split_chain(p, chain, i) {
                var new_chain = new Chain();
                new_chain.vertices = chain.vertices.splice(i);
                chain.vertices.push(p);
                new_chain.vertices.splice(0, 0, p);
                chain.signed_regions.forEach(([sign, region])=> {
                    region.signed_chains.push([sign, new_chain])
                    new_chain.signed_regions.push([sign, region])
                })
                return new_chain;
            }
            
            new_region = new Region();
            /*
            if (chains.length == 1) {
                // starting and ending on the same chain
                console.assert(start.chain == end.chain);
                if (end.i >= start.i) {
                    console.log("starting point before ending point on the same chain");
                    return;
                }
            }
            */

            /*
            if (start.chain.vertex_end() == start.chain.vertex_start()) {
                // closed chain 
                const p = chain.vertex_end();
                start.chain.vertices.splice(0,1); // remove first (repeated) vertex
                var tail = start.chain.vertices.splice(start.i);
                start.chain.vertices = [p].concat(tail).concat(start.chain.vertices).concat([p]);
                if (end.chain == start.chain) {
                    if (end.i < start.i) {
                        end.i += start.chain.vertices.length-start.i;
                    } else {
                        end.i -= start.i;
                    }
                }
            } else {
                */
                split_chain(chain.vertex_end(), start.chain, start.i); // discard last part
            // }
            chains[chains.length-1] = split_chain(chain.vertex_start(), end.chain, end.i);
            chains.forEach(c => new_region.signed_chains.push([-1, c]));
            new_region.signed_chains.push([1, chain])
            this.regions.push(new_region);

        }

        this.clear_cache();
        new_region.area_target = new_region.area();
    
        this.compute_topology();
    }
}

function chain(v, w, n=5) {
    var chain = new Chain();
    chain.vertices.push(v);
    for (var i=1; i<n; ++i) {
        chain.vertices.push(new Vertex(
            (n-i)*v.x/n + i*w.x/n,
            (n-i)*v.y/n + i*w.y/n ));
    }
    chain.vertices.push(w);
    return chain;
}

function new_bouquet(n) {
    var cluster = new Cluster();
    const origin = new Vertex(0,0);
    var vertices = [];
    var chains = [];
    for(var i=0; i<n; ++i) {
        const t = 2 * Math.PI * i / n;
        vertices.push(new Vertex(Math.cos(t), Math.sin(t)));
        chains.push(chain(origin, vertices[i], 5));
    }
    for(var i=0; i<n; ++i) {
        var region = new Region();
        region.signed_chains.push([1, chains[i]])
        region.signed_chains.push([1, chain(vertices[i], vertices[(i+1)%n], 25)]);
        region.signed_chains.push([-1, chains[(i+1)%n]]);
        cluster.regions.push(region);
    }
    cluster.clear_cache();
    cluster.compute_topology();
    cluster.compute_forces();
    return cluster;
}