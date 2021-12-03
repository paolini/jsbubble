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
        this.edges = [];
    }
}
class Region {
    constructor(cluster, area, pressure) {
        this.cluster = cluster;
        this.components = []; // list of list of vertices
        this.area = area;
        this.pressure = pressure;
    }

    has_vertex(v) {
        for (var j=0; j<this.components.length; ++j) {
            const component = this.components[j];
            for (var i=0; i<component.length; ++i) {
                if (component[i] == v) return true;
            }
        }
        return false;
    }

    compute_area() {
        var area2 = 0.0;

        this.components.forEach(function(component) {
            for (var i=0; i<component.length; ++i) {
                var v = component[i];
                var w = i+1 < component.length ? component[i+1] : component[0];
                area2 += (v.y + w.y) * (v.x - w.x);
            }            
        });

        return 0.5 * area2;
    }

    is_inside(p) { // p: Vec
        while (true) {
            var count = 0;
            for (var j=0;count >=0 && j<this.components.length; ++j) {
                const component = this.components[j];
                for (var i=0; i<component.length; ++i) {
                    const k = component[i];
                    const j = i+1 < component.length ? component[i+1] : component[0];
                    if (j.x < p.x && k.x < p.x) continue;
                    if (j.x > p.x && k.x > p.x) continue;
                    if (j.x == p.x || k.x == p.x) {
                        // bad luck!! retry...
                        p = new Vec(p.x + Math.random()*0.0000001, p.y);
                        count = -1;
                        break;
                    }
                    var y0 = j.y + (p.x - j.x)*(k.y-j.y)/(k.x-j.x);
                    if (y0 == p.y) {
                        count = 0; // on the boundary!
                        return true; 
                    } 
                    if (y0 > p.y) count ++; // one intersection above!
                }
            }
            if (count >= 0) return count % 2 ? true : false;
        }
    }

    ray_hits(p, q) { // p: Vec, q: Vec
        // fire a ray from point p
        // towards point q:
        // p+t(q-p)
        // and find first positive t<1 of contact with region

        var hit = { // best hit so far
            t: Infinity, 
            vertex: null,
            s: null
        }

        var start = null;
        const dp0 = new Vec(q.x - p.x, q.y - p.y);
        for (var j=0; j<this.components.length; ++j) {
            const component = this.components[j];
            for (var i=0;i<component.length;i++) {
                const p0 = component[i];
                const p1 = component[i+1<component.length?i+1:0];

                if (p.x<p0.x && p.x<p1.x && q.x<p0.x && q.x<p1.x) continue;
                if (p.x>p0.x && p.x>p1.x && q.x>p0.x && q.x>p1.x) continue;
                if (p.y<p0.y && p.y<p1.y && q.y<p0.y && q.y<p1.y) continue;
                if (p.y>p0.y && p.y>p1.y && q.y>p0.y && q.y>p1.y) continue;
                const h = lines_intersect(p, q, p0, p1);
                const t = h[0];
                const s = h[1];
                if (s<0 || s>1 || t<0) continue;
                if (t < hit.t) {
                    hit.t = t;
                    hit.component = component;
                    hit.component_index = i; 
                    hit.s = s;
                }
            }
        }
        return hit;
    }
}
class Cluster {
    constructor() {
        this.vertices = [];
        this.regions = []; 
    }

    region_containing(p) {
        this.regions.forEach(function(region) {
            if (region.is_inside(p)) return region;
        });
        return null;
    }

    compute_topology() {
        // clear topology:
        this.vertices.forEach(function(vertex) {
            vertex.topology = {
                'regions': [], // [{region, vertex_next, vertex_prev}, ...]
                'vertices': [] // [[adjacent vertices...], ...]
            };
        });

        // compute topology:
        this.regions.forEach(function(region) {
            region.components.forEach(function(component){
                for(var i=0; i<component.length; ++i) {
                    const vertex = component[i];
                    const vertex_next = component[i+1<component.length?i+1:0];
                    const vertex_prev = component[i>0?i-1:component.length-1];
                    vertex.topology.regions.push({
                        'region': region,
                        'vertex_next': vertex_next,
                        'vertex_prev': vertex_prev
                    });
                    if (!vertex.topology.vertices.includes(vertex_prev))
                        vertex.topology.vertices.push(vertex_prev);
                    if (!vertex.topology.vertices.includes(vertex_next))
                        vertex.topology.vertices.push(vertex_next);
                }
            });
        });

        // add external region:
        this.vertices.forEach(function(vertex) {
            const regions = vertex.topology.regions;
            const vertices = vertex.topology.vertices;
            console.assert(regions.length>=1);
            console.assert(regions.length<=3);            
            if (regions.length == 1) {
                console.assert(vertices.length == 2);
                // internal vertex of an external edge
                regions.push({  
                    'region': null,
                    'vertex_next': regions[0].vertex_prev,
                    'vertex_prev': regions[0].vertex_next
                });
            } else if (regions.length == 2) {
                if (vertices.length == 3) {
                    // triple point on the external edges
                    if (regions[0].vertex_next == regions[1].vertex_prev) {
                        regions.push({
                            'region': null,
                            'vertex_next': regions[0].vertex_prev,
                            'vertex_prev': regions[1].vertex_next
                        });
                    } else {
                        assert(regions[1].vertex_next == regions[0].vertex_prev)
                        regions.push({
                            'region': null,
                            'vertex_next': regions[1].vertex_prev,
                            'vertex_prev': regions[0].vertex_next
                        });
                    }
                } else {
                    assert (vertices.length == 2);
                }
            }
        });
    }

    clear_forces() {
        this.vertices.forEach(function(v) {
            v.force.x = 0.0;
            v.force.y = 0.0;
            v.edges.length = 0;
        });
    }

    compute_forces() {
        this.clear_forces();

        this.vertices.forEach(function(v) {

            // curvature
            var fx = 0.0, fy = 0.0;
            v.topology.vertices.forEach(function(w) {
                fx += w.x;
                fy += w.y;
            });
            fx -= v.x*v.topology.vertices.length;
            fy -= v.y*v.topology.vertices.length;
            v.force.x += fx;
            v.force.y += fy;             

            // pressure
            v.topology.regions.forEach(function(r) {
                if (r.region) {
                    const prev = r.vertex_prev;
                    const next = r.vertex_next;
    
                    const wx = next.y - prev.y;
                    const wy = - next.x + prev.x;
                    const l = Math.sqrt(wx*wx + wy*wy);

                    v.force.x += r.region.pressure * wx ;
                    v.force.y += r.region.pressure * wy ;
                }
            })
        });
    }

    bump_vertex_new(v, t=1.0) { // v: Vertex
        if (v.force.x == 0.0 && v.force.y == 0.0) return;
        var vv = new Vec(v.x + t*v.force.x, v.y + t*v.force.y);
        this.regions.forEach(function(region) {
            if (v.edges.find(info => info.region==region)) return; // vertex belongs to this region
            region.components.forEach(function(component) {
                for(var i=0; i<component.length; ++i) {
                    var j = i+1<component.length ? i+1 : 0;
                    hit = lines_intersect(v, vv, component[i], component[j]);
                    /// TO BE COMPLETED!!!
                }                
            });
        });
    }

    bump_vertex(v) { // v: Vertex
        // does not change the number of vertices
        if (v.force.x == 0.0 && v.force.y == 0.0) return;
        var t = 1.0; // allowed movement t*v.force
        var hit = {t: Infinity}
        for (var i=0; i<this.regions.length; ++i) {
            const region = this.regions[i];
            if (region.has_vertex(v)) continue; // vertex is on region contour
            var h = region.ray_hits(v, new Vec(v.x + v.force.x, v.y + v.force.y));
            if (h.t < hit.t) hit = h;
        }
        if (hit.t<=1.0) {
            // BUMP!
            v.x += hit.t * v.force.x;
            v.y += hit.t * v.force.y;
            hit.component.splice(hit.component_index+1, 0, v);
        } else {
            v.x += v.force.x;
            v.y += v.force.y;
        }
        v.force.x = 0.0;
        v.force.y = 0.0;
    }

    bump() {
        var self = this;
        this.vertices.forEach(function(v) {self.bump_vertex(v);});
    }

    evolve_vertex(v, dt) {
        v.x += dt * v.force.x;
        v.y += dt * v.force.y;
    }

    evolve(dt) {
        this.regions.forEach(function(region) {region.last_area = region.compute_area()});
        // move vertices along forces
        var self = this;
        this.vertices.forEach(function(v) {
            self.evolve_vertex(v, dt);
        })
        // compute forces
        this.compute_forces();
    }

    add_bubble(center, r, n=15) {
        // construct cluster with a single bubble
        var in_region = this.region_containing(center);
        if (in_region) {
            console.log("currently cannot add region inside other region");
            return 0;
        }
        var new_region = new Region(this, Math.PI*r*r, 1.0/r);
        var component = [];
        var w = null;
        for(var i=0; i<n; ++i) {
            const t = 2.0 * Math.PI * i / n;
            var v =  new Vertex(center.x, center.y);
            v.force.x = r * Math.cos(t);
            v.force.y = r * Math.sin(t);
            v.edges.push({
                'region': new_region,
                'component': component,
                'i': i,
                'next': (i+1<n?null:component[0]),
                'prev': (i>0?component[component.length-1]:null)
            });
            if (i>0) {
                w.edges[0].next = v;
            }
            if (i+1==n) {
                component[0].edges[0].prev = v;
            }
            w = v;
            component.push(v);
            this.vertices.push(v);
        } 
        new_region.components.push(component);
        this.regions.push(new_region);
        this.evolve();
        return 1;
    }

    add_n_bubble(center, r, n, n_vertices=5) {
        //create vertices
        var segments = [];
        var arcs = [];
        const alpha = 2 * Math.PI / n;

        var origin = new Vertex(0.0, 0.0);

        this.vertices.push(origin);

        for (var k=0; k<n; ++k) {
            var segment = [];
            var angle = 0.5*alpha + k*alpha;
            for (var j=1; j<n_vertices; ++j) {
                var t = r*j/n_vertices;
                var v = new Vertex(
                    center.x + t * Math.cos(angle), 
                    center.y + t * Math.sin(angle));
                segment.push(v);
                this.vertices.push(v);
            }
            segments.push(segment);
            angle = k*alpha;
            var arc = [];
            for (var j=0; j-1<2*n_vertices; ++j) {
                var a = angle - 0.5*Math.PI + Math.PI*j/n_vertices/2;
                var v = new Vertex(
                    center.x + r*Math.cos(angle) + r*Math.cos(a),
                    center.y + r*Math.sin(angle) + r*Math.sin(a));
                arc.push(v);
                this.vertices.push(v);
            }
            arcs.push(arc);
        }

        // create regions
        for (var k=0; k<n; ++k) {
            var region = new Region(this, Math.PI * r * r, 1/r);
            var component = [origin];
            segments[k].reverse();
            component = component
                .concat(segments[(k+n-1) % n])
                .concat(arcs[k])
                .concat(segments[k])
            segments[k].reverse();
            region.components.push(component);
            this.regions.push(region);
        }

        // compute adjacency information
        this.compute_topology();
        this.compute_forces();
        return n;
    }
}