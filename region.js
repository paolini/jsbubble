function path_area(signed_chains) {
    let area = 0.0
    signed_chains.forEach( ([sign, chain]) => {
            area += sign * chain.area()
    })
    return area
}


class Region {
    constructor(area_target=1.0) {
        this.signed_chains = [] // [sign, chain]

        this.area_target = area_target;
        
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
        if (this._area === null) {
            this._area = path_area(this.signed_chains)
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

    split(chain) {
        //
        // create new region by splitting this with chain
        // chain must be already be in the cluster
        // and have end-points on vertices of this region
        //
        //           end
        //  ,----<----.----<---.
        //  |                  |
        //  |    this          |
        //  |                  |
        //  `--->-----.---->---'
        //          start
        //
        //           end
        //  ,----<----,----<-----.
        //  |         |          |
        //  |         ^chain     |
        //  | region  | this     |
        //  `--->-----'---->-----'
        //          start

        // for later use
        let old_area = this.area()

        // find cycle along region chains from start to end
        // move chains of cycle from this to new region
        let start = chain.vertex_end()
        let end = chain.vertex_start()
        let path = locate_path(this.signed_chains, start, end, 1)
        if (path === null) return null

        let region = new Region()
        region.cluster = this.cluster
        this.cluster.regions.push(region)


        path.forEach(([sign, chain]) => {
            signed_elements_remove(this.signed_chains, sign, chain)
            region.signed_chains.push([sign, chain])

            chain.signed_regions = chain.signed_regions
            .map(([ s, r ]) => {
                if (r === this) {
                    // assign chain to new region
                    return [ s, region ]
                } else {
                    return [ s, r ]
                }
            })    
        })

        // insert chain to both regions
        region.signed_chains.push([1, chain])
        chain.signed_regions.push([1, region])
        this.signed_chains.push([-1, chain])
        chain.signed_regions.push([-1, this])

        this.invalidate()

        // subdivide target_area proportionally
        let ratio = old_area / this.area_target
        this.area_target = ratio * this.area()
        region.area_target = ratio * region.area()

        return region
    }
}
