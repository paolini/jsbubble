function ray_intersect(x0, y0, dx0, dy0, x1, y1, dx1, dy1) {
    // return [t0, t1] such that 
    // x0 + t0 * dx0 = x1 + t1 * dx1
    // y0 + t0 * dy0 = y1 + t1 * dy1
    const det = dx1 * dy0 - dx0 * dy1;
    const det0 = dx1 * (y1-y0) - (x1-x0) * dy1;
    const det1 = dx0 * (y1-y0) - (x1-x0) * dy0;

    return [det0 / det, det1 / det];
}

class Cluster {
    constructor() {
        this.xs = [];
        this.ys = []; // ys.length == xs.length
        this.force_xs = []; // force_xs.length == xs.length
        this.force_ys = []; // force_ys.length == force_xs.length
        this.regions = []; // last point repeated: regions[i].length == total_points + n_loops
        this.areas = []; // areas.length == regions.length
        this.pressures = []; // pressures.length == regions.length
    }

    compute_area(region) {
        area2 = 0.0;
        start = null;
        for (var i=0; i<region.length; ++i) {
            var k = region[i];
            var j = region[i+1];
            if (start == null) {
                start = k;
            } else if (k == start) {
                start = null;
                continue; // next loop
            }
            area2 += (this.ys[k]+this.ys[j])*(this.xs[j]-this.xs[k]);
        }
        if (start != null) {
            console.log("path not closed!");
        }
        return 0.5 * area2;
    }

    compute_forces() {
        this.force_xs.length = this.xs.length;
        this.force_ys.length = this.xs.length;
        for (var i=0;i<this.xs.length; i++) {
            this.force_xs[i] = 0.0;
            this.force_ys[i] = 0.0;
        }
        for (var i=0;i<this.regions.length;++i) {
            compute_forces_region(this.regions[i]);
        }
    }

    compute_forces_region(region) {
        for (var i=0;i<region.length;++i) {

        }
    }

    add_bubble(x, y, r, area, n=10) {
        // construct cluster with a single bubble
        const N = this.xs.length;
        var in_region = this.region_containing(x,y);
        if (in_region>=0) {
            console.log("currently cannot add region inside other region");
            return 0;
        }
        var new_region = [];
        this.regions.push(new_region);
        this.areas.push(area?area:Math.PI*r*r);
        this.pressures.push(1.0 / r);
        for(var i=0; i<n; ++i) {
            const t = 2.0 * Math.PI * i / n;
            const v = this.xs.length; 
            this.xs.push(x);
            this.ys.push(y);
            this.force_xs.push(r * Math.cos(t));
            this.force_ys.push(r * Math.sin(t));
            new_region.push(v);
        } 
        new_region.push(new_region[0]); // close loop
        this.evolve();
        return true;
    }

    region_containing(x, y) {
        for (var i=0;i<this.regions.length; ++i) {
            if (this.is_inside_region(x, y, this.regions[i])) {
                return i;
            }
        }
        return -1;
    }

    is_inside_region(x, y, region) {
        const xs = this.xs;
        const ys = this.ys;
        var start = null;
        while (true) {
            var count = 0;
            for (var i=0;i<region.length;i++) {
                var k = region[i];
                var j = region[i+1];
                if (start == null) {
                    start = k;
                } else if (k == start) { // close loop
                    start = null;
                    continue;
                }
                if (xs[j] < x && xs[k] < x) continue;
                if (xs[j] > x && xs[k] > x) continue;
                if (xs[j] == x || xs[k] == x) {
                    // bad luck!
                    x += Math.random()*0.0000001;
                    count = -1;
                    break; // try again!
                }
                var y0 = ys[j] + (x - xs[j])*(ys[k]-ys[j])/(xs[k]-xs[j]);
                if (y0 == y) return true; // on the boundary!
                if (y0 > y) count ++; // one intersection above!
            }
            if (count >= 0) {
                return count % 2 ? true : false;
            }
        }
    }

    ray_hits_region(x,y, xx,yy, region) {
        // fire a ray from point (x,y)
        // towards point (xx, yy):
        // (x+t(xx-x), y+t(yy-y))
        // and find first positive t<1 of contact with region

        var hit = { // best hit so far
            t: Infinity, 
            vertex: null,
            s: null
        }

        var start = null;
        const dx0 = xx - x;
        const dy0 = yy - y;
        for(var i=0;i<region.length;i++) {
            if (region[i] == start) {
                start = null;
                continue;
            }
            if (start == null) {
                start = region[i];
            }
            const x0 = this.xs[region[i]];
            const y0 = this.ys[region[i]];
            const x1 = this.xs[region[i+1]];
            const y1 = this.ys[region[i+1]];

            if (x<x0 && x<x1 && xx<x0 && xx<x1) continue;
            if (x>x0 && x>x1 && xx>x0 && xx>x1) continue;
            if (y<y0 && y<y1 && yy<y0 && yy<y1) continue;
            if (y>y0 && y>y1 && yy>y0 && yy>y1) continue;
            const h = ray_intersect(x,y, xx-x, yy-y, x0,y0, x1-x0,y1-y0);
            const t = h[0];
            const s = h[1];
            if (s<0 || s>1 || t<0) continue;
            if (t < hit.t) {
                hit.t = t;
                hit.i = i;
                hit.s = s;
            }
        }
        return hit;
    }

    evolve_vertex(vertex) {
        const x = this.xs[vertex];
        const y = this.ys[vertex];
        const fx = this.force_xs[vertex];
        const fy = this.force_ys[vertex];
        if (fx == 0.0 && fy == 0.0) return;
        var t = 1.0; // allowed movement t*fx, t*fy
        var hit = {t: Infinity}
        for (var i=0; i<this.regions.length; ++i) {
            const region = this.regions[i];
            var j=0;
            for (;j<region.length && region[j]!=vertex;++j);
            if (j<region.length) continue; // vertex is on region contour
            var h = this.ray_hits_region(x, y, x+fx, y+fy, region);
            h.region = region;
            if (h.t < hit.t) hit = h;
        }
        if (hit.t<=1.0) {
            // BUMP!
            this.xs[vertex] += hit.t * fx;
            this.ys[vertex] += hit.t * fy;
            hit.region.splice(hit.i+1, 0, vertex);
        } else {
            this.xs[vertex] += fx;
            this.ys[vertex] += fy;
        }
        this.force_xs[vertex] = 0.0;
        this.force_ys[vertex] = 0.0;
    }

    evolve() {
        // move vertices along forces
        for(var i=0; i<this.xs.length; ++i) {
            this.evolve_vertex(i);
        }
    }

}