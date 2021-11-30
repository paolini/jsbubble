
class Cluster {
    constructor() {
        this.xs = [];
        this.ys = []; // ys.length == xs.length
        this.force_xs = []; // force_xs.length == xs.length
        this.force_ys = []; // force_ys.length == force_xs.length
        this.regions = []; // last point repeated: regions.length == total_points + n_loops
        this.areas = []; // areas.length == regions.length
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
        this.xs = this.xs.concat(Array(n));
        this.ys = this.ys.concat(Array(n));
        var in_region = this.region_containing(x,y) >= 0;
        if (in_region >= 0) {
            console.log("cannot add bubble inside existing region");
            return;
        }
        var region = Array(n+1);
        for(var i=0; i<n; ++i) {
            const t = 2.0 * Math.PI * i / n;
            var xx = x + r * Math.cos(t);
            var yy = y + r * Math.sin(t);
            var inside = this.region_containing(xx,yy);
            if (inside >=0) {
                // inside other region.
            }
            this.xs[N + i] = xx;
            this.ys[N + i] = yy;
            region[i] = N + i;
        } 
        region[n] = region[0]; // close loop

        for (var j=0; j<this.regions.length; j++) {
            this.check_region_region_compenetration(region, this.regions[j]);
        }

        this.regions.push(region);
        this.areas.push(area);
        this.n += n;
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

    check_region_region_compenetration(region, in_region) {
        var count = 0;
        start = null;
        for (var i=0; i<region.length; ++i) {
            if (region[i] == start) {
                start = null;
                continue;
            }
            if (start == null) {
                start = region[i];
            }
            var x = this.xs[region[i]];
            var y = this.ys[region[i]];
            if (this.is_inside(x,y,in_region)) {
                var in_start = null;
                var dist2 = Infinity;
                var found = null;
                for (var j=0; j<in_region.length;++j) {
                    if (in_region[j] == start) {
                        start = null;
                        continue;
                    }
                    if (start == null) {
                        start = in_region[j];
                    }
                    var xx = this.xs[in_region[j]];
                    var yy = this.ys[in_region[j]];
                    var d2 = (xx-x)*(xx-x) + (yy-y)*(yy-y);
                    if (d2<dist2) {
                        found = j;
                    }
                }
                if (in_region[found] != region[i]) {
                    // if the regions have a common point: that's ok!
                    // stick point i of region with point found of in_region:
                    // add found after i in region and i after found in in_region
                    region.splice(i+1, 0, in_region[found]);
                    in_region.splice(found+1, 0, region[i]);
                    count += 1;
                    i++; 
                }
            }
        }
    }
}