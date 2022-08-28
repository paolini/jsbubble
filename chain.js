class Chain {
    constructor() {
        this.vertices = [];
        // computed:
        this.signed_regions = []
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

    has_negative_region() {
        this.signed_regions.forEach(([sign, region]) => {
            if (sign < 0) return true
        })
        return false
    }
}
