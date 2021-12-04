function lines_intersect(p0, p1, q0, q1) {
    // return [t0, t1] such that 
    // p0 + t0 * (p1-p0) = q0 + t1 * (q1-q0)
    const det  = (q1.x-q0.x) * (p1.y-p0.y) - (p1.x-p0.x) * (q1.y-q0.y);
    const det0 = (q1.x-q0.x) * (q0.y-p0.y) - (q0.x-p0.x) * (q1.y-q0.y);
    const det1 = (p1.x-p0.x) * (q0.y-p0.y) - (q0.x-p0.x) * (p1.y-p0.y);

    return [det0 / det, det1 / det];
}

function norm(v) {
    return Math.sqrt(v.x*v.x - v.y*v.y);
}

function distance(p, q) {
    // p,q: Vec
    return Math.sqrt((p.x-q.x)*(p.x-q.x) + (p.y-q.y)*(p.y-q.y));
}
class Vec {
    constructor(x,y) {
        this.x = x;
        this.y = y;
    }
}
class Vertex extends Vec {
    constructor(x, y) {
        super(x, y);
        this.force = new Vec(0.0, 0.0);
    }

    evolve(dt) {
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

    evolve(dt) {
        // extremal vertices are evolved elsewhere
        for(var i=1;i<this.vertices.length-1;++i) {
            this.vertices[i].evolve(dt);
        }
    }
}

class Region {
    constructor(target_area=1.0) {
        this.chains_positive = [];
        this.chains_negative = [];

        this.target_area = target_area;
        
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
            add_triple_point(chain.vertices[0]);
            add_triple_point(chain.vertices[chain.vertices.length-1]);
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
            var ds = Math.pow(chain.length() / (chain.vertices.length-1), 1);
            // curvature
            for(var i=1; i<chain.vertices.length; ++i) {
                const v = chain.vertices[i-1];
                const w = chain.vertices[i];

                const fx = (w.x-v.x) / ds;
                const fy = (w.y-v.y) / ds;
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

    evolve(dt) {
        this.regions.forEach(function(region){
            region.area_prev = region.area();
        });

        // move vertices along forces
        this.triple_points.forEach(function(v) {
            v.evolve(dt);
        });

        this.chains.forEach(function(chain) {
            chain.evolve(dt);
        });

        this.clear_cache();

        // update pressures
        this.regions.forEach(function (region) {
            var area = region.area();
            var target = Math.max(Math.min(region.target_area, 1.05*area),0.95*area);
            var p = (target - area) / dt;
            region.pressure += 0.5*(p-region.pressure);
        });

        this.compute_forces();
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
        region.chains_positive.push(chain(vertices[i], vertices[(i+1)%n], 5));
        region.chains_negative.push(chains[(i+1)%n]);
        cluster.regions.push(region);
    }
    cluster.clear_cache();
    cluster.compute_topology();
    cluster.compute_forces();
    return cluster;
}