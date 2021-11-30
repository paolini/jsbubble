function ray_intersect(v0, dv0, v1, dv1) {
    // return [t0, t1] such that 
    // v0 + t0 * dv0 = v1 + t1 * dv1
    const det = dv1.x * dv0.y - dv0.x * dv1.y;
    const det0 = dv1.x * (v1.y-v0.y) - (v1.x-v0.x) * dv1.y;
    const det1 = dv0.x * (v1.y-v0.y) - (v1.x-v0.x) * dv0.y;

    return [det0 / det, det1 / det];
}
class Vec {
    constructor(x,y) {
        this.x = x;
        this.y = y;
    }
}
class Region {
    constructor(cluster, area, pressure) {
        this.cluster = cluster;
        this.components = []; // list of list of vertices
        this.area = area;
        this.pressure = 0.0;
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
                area2 += (v.y + w.y) * (w.x - v.x);
            }            
        });

        return 0.5 * area2;
    }

    compute_forces() {    
        this.components.forEach(function(component) {
            // TO BE COMPLETED
        });  
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
                const h = ray_intersect(
                    p, new Vec(q.x-p.x, q.y-p.y), 
                    p0, new Vec(p1.x-p0.x, p1.y-p0.y));
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
class Vertex extends Vec {
    constructor(x, y) {
        super(x, y);
        this.force = new Vec(0.0, 0.0);
    }
}

class Cluster {
    constructor() {
        this.vertices = [];
        this.regions = []; 
    }

    compute_forces() {
        this.vertices.forEach(function(v) {
            v.force.x = 0.0;
            v.force.y = 0.0;
        });
        this.regions.forEach(function(region) {
            region.compute_forces();
        })
    }

    add_bubble(center, r, area, n=15) {
        // construct cluster with a single bubble
        var in_region = this.region_containing(center);
        if (in_region) {
            console.log("currently cannot add region inside other region");
            return 0;
        }
        var component = [];
        for(var i=0; i<n; ++i) {
            const t = 2.0 * Math.PI * i / n;
            var v =  new Vertex(center.x, center.y);
            v.force.x = r * Math.cos(t);
            v.force.y = r * Math.sin(t);
            component.push(v);
            this.vertices.push(v);
        } 
        var new_region = new Region(this, area?area:Math.PI*r*r, 1.0/r);
        new_region.components.push(component);
        this.regions.push(new_region);
        this.evolve();
        return 1;
    }

    region_containing(p) {
        this.regions.forEach(function(region) {
            if (region.is_inside(p)) return region;
        });
        return null;
    }

    evolve_vertex(v) { // v: Vertex
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

    evolve() {
        // move vertices along forces
        var self = this;
        this.vertices.forEach(function(v) {
            self.evolve_vertex(v);
        })
    }

}