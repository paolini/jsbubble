class Vec {
    constructor(x,y) {
        this.x = x;
        this.y = y;
    }

    clamp(maxlen) {
        var l = vec_norm(this);
        if (l>maxlen) {
            this.x *= maxlen/l;
            this.y *= maxlen/l;
        }
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
    }

    mul(t) {
        this.x *= t;
        this.y *= t;
    }

    div(t) {
        this.x /= t;
        this.y /= t;
    }
}

function vec_norm(v) {
    return Math.sqrt(v.x*v.x - v.y*v.y);
}

function vec_distance(p, q) {
    // p,q: Vec
    return Math.sqrt((p.x-q.x)*(p.x-q.x) + (p.y-q.y)*(p.y-q.y));
}

function vec_add(v, w) {
    return new Vec(v.x + w.x, v.y + w.y);
}

function vec_sub(v, w) {
    return new Vec(v.x - w.x, v.y - w.y);
}

function vec_mul(v, t) {
    return new Vec(v.x * t, v.y * t);
}

function vec_div(v, t) {
    return new Vec(v.x / t, v.y / t);
}

function lines_intersect(p0, p1, q0, q1) {
    // return [t0, t1] such that 
    // p0 + t0 * (p1-p0) = q0 + t1 * (q1-q0)
    const det  = (q1.x-q0.x) * (p1.y-p0.y) - (p1.x-p0.x) * (q1.y-q0.y);
    const det0 = (q1.x-q0.x) * (q0.y-p0.y) - (q0.x-p0.x) * (q1.y-q0.y);
    const det1 = (p1.x-p0.x) * (q0.y-p0.y) - (q0.x-p0.x) * (p1.y-p0.y);

    return [det0 / det, det1 / det];
}

class Vertex extends Vec {
    constructor(x, y) {
        super(x, y);
        this.force = new Vec(0.0, 0.0);
    }

    evolve(dt) {
        // this.clamp(2.0); // speed limit!
        this.x += dt * this.force.x;
        this.y += dt * this.force.y;
    }
}

class Chain {
    constructor() {
        this.vertices = [];
        // computed:
        this.region_left = null;
        this.region_right = null;
        this._length = null;
        this._area = null;
    }

    area() {
        if (this._area != null) return this._area;
        var area2 = 0.0;
        for (var i=1; i<this.vertices.length; ++i) {
            const v = this.vertices[i-1];
            const w = this.vertices[i];
            area2 += (v.y + w.y) * (v.x - w.x);
        }            
        this._area = 0.5 * area2;
        return this._area;
    }

    length() {
        if (this._length != null) return this._length;
        var l = 0.0;
        for (var i=1; i<this.vertices.length; ++i) {
            const v = this.vertices[i-1];
            const w = this.vertices[i];
            l += Math.sqrt(Math.pow(w.x-v.x, 2) + Math.pow(w.y-v.y, 2));
        }
        this._length = l;
        return this._length;
    }

    vertex_start() {return this.vertices[0];}

    vertex_end() {return this.vertices[this.vertices.length-1];}

    intersection_count(p) {
        // p: Vec
        // return: number of intersections of a vertical upward ray
        var count = 0;
        for (var i=1; i<this.vertices.length; ++i) {
            const k = this.vertices[i-1];
            const j = this.vertices[i];
            if (j.x < p.x && k.x < p.x) continue;
            if (j.x > p.x && k.x > p.x) continue;
            if (j.x == p.x || k.x == p.x) {
                return -1000000000;
            }
            var y0 = j.y + (p.x - j.x)*(k.y-j.y)/(k.x-j.x);
            if (y0 == p.y) {
                return 0; // on the boundary!
            } 
            if (y0 > p.y) count ++; // one intersection above!
        }
        return count;
    }
}

class Region {
    constructor(area_target=1.0) {
        this.chains_positive = [];
        this.chains_negative = [];

        this.area_target = area_target;
        
        // computed:
        this.pressure = 1.0;  // hint pressure
        this.cluster = null;
        this._area = null;
        this._perimeter = null;
    }

    area() {
        if (this._area == null) {
            var area = 0.0;
            this.chains_positive.forEach(function(chain) {
                area += chain.area();
            });
            this.chains_negative.forEach(function(chain) {
                area -= chain.area();
            });
            this._area = area;
        }
        return this._area;
    }

    perimeter() {
        if (this._perimeter == null) {
            var perimeter = 0.0;
            this.chains_positive.forEach(function(chain) {
                perimeter += chain.length();
            });
            this.chains_negative.forEach(function(chain) {
                perimeter += chain.length();
            });
            this._perimeter = perimeter;
        }
        return this._perimeter;
    }

    is_inside(p) { // p: Vec
        while (true) {
            var count = 0;
            
            this.chains_positive.forEach(function(chain) {
                count += chain.intersection_count(p);
            });

            this.chains_negative.forEach(function(chain) {
                count += chain.intersection_count(p);
            });

            if (count >= 0) return count % 2 ? true : false;

            // bad luck!! retry...
            p = new Vec(p.x + Math.random()*0.0000001, p.y);
        }
    }
}
class Cluster {
    constructor() {
        this.regions = []; 

        // computed:
        this.chains = [];
        this.triple_points = [];
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
        this.triple_points.forEach(function(vertex) {
            f(vertex);
        });
    }

    compute_topology() {
        var self = this;
        function add_triple_point(vertex) {
            if (!self.triple_points.includes(vertex)) {
                self.triple_points.push(vertex);
            }
        }

        function add_chain(chain) {
            if (!self.chains.includes(chain)) {
                self.chains.push(chain);
            }
            add_triple_point(chain.vertex_start());
            add_triple_point(chain.vertex_end());
        }

        this.regions.forEach(function(region) {
            region.cluster = self;
            region.chains_positive.forEach(function(chain) {
                add_chain(chain);   
                chain.region_left = region;
            });
            region.chains_negative.forEach(function(chain) {
                add_chain(chain);          
                chain.region_right = region;
            });
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
                if (chain.region_left != null) p += chain.region_left.pressure;
                if (chain.region_right != null) p -= chain.region_right.pressure;
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
        var count = 0;
        this.chains.forEach(chain => {
            count += chain.vertices.length-1;
        });
        const ds_avg = this.perimeter() / count; // average length of segment

        this.chains.forEach(chain => {
            const n = chain.vertices.length-1;
            if (ds_avg * (n+1) < chain.length()) {
                // add one more segment
                const k = Math.floor(Math.random()*(n-1));
                const v = chain.vertices[k]; // insert between this
                const w = chain.vertices[k+1]; // and this
                chain.vertices.splice(k+1, 0, new Vertex((v.x+w.x)/2, (v.y+w.y)/2));
            } else if (n>1 && ds_avg * (n-1) > chain.length()) {
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
            if (0) {
                var area = region.area();
                var target = Math.max(Math.min(region.area_target, 1.05*area),0.95*area);
                var p = (target - area) / dt;
                region.pressure += 0.3*(p-region.pressure);
            } else {
                region.pressure = region.area_target - region.area();
            } 
        });

        this.compute_forces();
    }

    add_chain(chain) {
        const cluster = this;
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

        const start = find_closest(chain.vertex_end()); // sic: start <- end
        const end = find_closest(chain.vertex_start()); // sic: end <- start

        if (start.chain.region_right != null) {
            console.log("cannot find starting point external edge");
            return;
        }

        if (end.chain.region_right != null) {
            console.log("cannot find ending point external edge");
        }

        var chains = [start.chain];
        
        // follow the chains backward along the cluster boundary
        while(chains[chains.length-1] != end.chain) {
            var i;
            for (i=0;i<this.chains.length; ++i) {
                if (this.chains[i].vertex_end() == chains[chains.length-1].vertex_start()
                    && this.chains[i].region_right == null) break;
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
            if (chain.region_left != null) {
                chain.region_left.chains_positive.push(new_chain);
                new_chain.region_left = chain.region_left;
            }
            if (chain.region_right != null) {
                chain.region_right.chains_negative.push(new_chain);
                new_chain.region_right = chain.region_right;
            }            
            return new_chain;
        }
        
        var new_region = new Region();
        if (chains.length == 1) {
            // starting and ending on the same chain
            console.assert(start.chain == end.chain);
            if (end.i >= start.i) {
                console.log("starting point before ending point on the same chain");
                return;
            }
        }
        split_chain(chain.vertex_end(), start.chain, start.i); // discard last part
        chains[chains.length-1] = split_chain(chain.vertex_start(), end.chain, end.i);
        chains.forEach(c => new_regions.chains_negative.push(c));
        new_regions.chains_positive.push(chain);
    
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
        region.chains_positive.push(chains[i]);
        region.chains_positive.push(chain(vertices[i], vertices[(i+1)%n], 25));
        region.chains_negative.push(chains[(i+1)%n]);
        cluster.regions.push(region);
    }
    cluster.clear_cache();
    cluster.compute_topology();
    cluster.compute_forces();
    return cluster;
}