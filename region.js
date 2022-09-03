class Region {
    constructor(area_target=1.0) {
        this.signed_chains = [] // [sign, chain]
        this.area_target = area_target
        this.pressure = 1.0  // hint pressure
        this.cluster = null
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

    clear() {
        // remove all chains
        this.signed_chains.forEach(([sign,chain]) => {
            signed_elements_remove(chain.signed_regions, null, this)
        })
        this.signed_chains = []
    }

    add_chain(sign, chain) {
        signed_elements_add(this.signed_chains, sign, chain)
        signed_elements_add(chain.signed_regions, sign, this)
    }

    signed_chain_next(sign, vertex) {
        // return next sign on boundary of this in direction 
        // sign>0 counterclockwise, sign<0 clockwise
        // returned sign is the orientation of the chain in the region
        return some(vertex.signed_chains, ([s,chain]) => 
                some(chain.signed_regions, ([ss, r]) => {
                    if (r === this && s*ss*sign >=0) return [ss, chain]
                }))
    }

}
