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
