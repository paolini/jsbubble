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
        let region = new Region()
        region.cluster = this.cluster
        this.cluster.regions.push(region)

        for(let v=start; v !== end;) {
            let r = null
            this.signed_chains.some(([ sign, chain ], i) => {
                if (chain.node(-sign) === v) {
                    r = chain.node(sign) // next node

                    // move chain to other region
                    this.signed_chains.splice(i, 1) // remove from this
                    region.signed_chains.push([ sign, chain ]) // add to new region

                    // update topology
                    chain.signed_regions = chain.signed_regions
                        .map(([ s, r ]) => {
                            if (r === this) {
                                // assign chain to new region
                                return [ s, region ]
                            } else {
                                return [ s, r ]
                            }
                        })    
                    return true
                }
            })
            console.assert(r!==null)
            console.assert(r!==start)
            v = r
        }

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

function locate_path(signed_chains, start, end, sign) {
    // return a signed_chains following the oriented chains
    // from start to end 
    let path = []
    for(let v=start; v!== end;) {
        let next = null
        signed_chains.some(([s, chain]) => {
            if (chain.node(-sign*s) === v) {
                next = chain.node(sign*s)
                path.push([s*sign, chain])
                return true
            }
        })
        if (next === null) throw new Error("locate_path failed")
        v = next
    }
    return path
}
