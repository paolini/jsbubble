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

    split(chain) {
        // create new region by splitting this with chain
        //
        //           end
        //  ,----<---------<---.
        //  |                  |
        //  |      this        |
        //  |                  |
        //  `--->---------->---'
        //          start
        //
        //           end
        //  ,----<----,----<-----.
        //  |         |          |
        //  |         ^chain     |
        //  |   new   |   this   |
        //  `--->-----'---->-----'
        //          start

        function find_closest(chains, p) {
            let best = {
                'd': Infinity,
                'chain': null,
                'i': null,
                'vertex': null
            }
            chains.forEach(chain => {
                for(i=1; i<chain.vertices.length-1; ++i) {
                    const vertex = chain.vertices[i]
                    const d = vec_distance(vertex, p);
                    if (d < best.d) {
                        best.d = d;
                        best.chain = chain;
                        best.i = i;
                        best.vertex = vertex
                    }
                }
            });
            return best;
        }

        let chains = this.signed_chains.map(([sign, chain]) => chain)
        let start = find_closest(chains, chain.vertex_start())
        let end = find_closest(chains, chain.vertex_end())
        console.assert(start.vertex !== end.vertex)

        start = start.chain.split(start.i)

        // repeat search because chains have changed!
        end = find_closest(chains, chain.vertex_end())
        console.assert(start.vertex !== end.vertex)

        end = end.chain.split(end.i)

        chain.vertices.unshift(start.node)
        start.node.signed_chains.push([1,chain])
        chain.vertices.push(end.node)
        end.node.signed_chains.push([-1,chain])
    }
}
