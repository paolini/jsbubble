class Region {
    constructor(area_target=1.0) {
        this.signed_chains = [] // [sign, chain]

        this.area_target = area_target;
        
        // computed:
        this.pressure = 1.0;  // hint pressure
        this.cluster = null;
        this.invalidate()
    }
    
    invalidate() {
        this._area = null
        this._perimeter = null
    }

    check_topology() {
        this.signed_chains.forEach(([sign, chain]) => {
            let total = 0
            chain.signed_regions.forEach(([sign_,region]) => {
                if (region === this) {
                    total += sign_
                }
            })
            console.assert(total === sign)
        })
    }

    area() {
        if (this._area == null) {
            var area = 0.0;
            this.signed_chains.forEach( ([sign, chain]) => {
                area += sign * chain.area()
            })
            this._area = area;
        }
        return this._area;
    }

    perimeter() {
        if (this._perimeter == null) {
            var perimeter = 0.0;
            this.signed_chains.forEach(([sign, chain]) => {
                perimeter += chain.length();
            })
            this._perimeter = perimeter;
        }
        return this._perimeter;
    }

    is_inside(p) { // p: Vec
        while (true) {
            var count = 0;
            
            this.signed_chains.forEach( ([sign, chain]) => {
                count += chain.intersection_count(p)
            })

            if (count >= 0) return count % 2 ? true : false;

            // bad luck!! retry...
            p = new Vec(p.x + Math.random()*0.0000001, p.y);
        }
    }

    split_by(chain) {
        // create new region by splitting this with chain

        function find_closest(chains, p) {
            var best_d = Infinity;
            var best_chain = null;
            var best_i = null;
            chains.forEach(chain => {
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



    }
}
