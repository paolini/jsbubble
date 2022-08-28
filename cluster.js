class Cluster {
    constructor() {
        this.regions = []; 

        this.ds = 0.1; // length of segments

        // computed:
        this.chains = [];
        this.nodes = [];
        this._perimeter = null;

        this.id_vertex = 1
        this.id_chain = 1
        this.id_region = 1
    }

    invalidate() {
        this._perimeter = null
    }

    invalidate_deep() {
        this.invalidate()
        this.regions.forEach(region => region.invalidate())
        this.chains.forEach(chain => chain.invalidate())
    }

    check_topology() {
        this.regions.forEach(region => {
            console.assert(region.cluster === this)
            region.check_topology()
        })
    }

    perimeter() {
        if (this._perimeter == null) {
            var perimeter = 0.0;
            this.chains.forEach(chain => {
                perimeter += chain.length();
            });
            this._perimeter = perimeter;
        }
        return this._perimeter;
    }

    translate(v) {
        this.each_vertex(vertex => {
            vertex.add(v)
        });
    }

    each_vertex(f) {
        this.chains.forEach(function(chain) {
            for(var i=1; i<chain.vertices.length-1; ++i) {
                f(chain.vertices[i]);
            }
        });
        this.nodes.forEach(function(vertex) {
            f(vertex);
        });
    }

    compute_topology() {

        let add_node = (sign, chain, vertex) => {
            if (!this.nodes.includes(vertex)) {
                this.nodes.push(vertex);
                vertex.signed_chains = []
            }
            vertex.signed_chains.push([sign, chain])
        }

        this.nodes = []
        this.chains = []
        this.regions.forEach(region => {
            region.cluster = this;
            region.signed_chains.forEach(([sign, chain]) => {
                if (!this.chains.includes(chain)) {
                    this.chains.push(chain);
                    chain.signed_regions = []
                    add_node(1, chain, chain.vertex_start());
                    add_node(-1, chain, chain.vertex_end());
                }
                chain.signed_regions.push([sign, region])
            })
        })

        console.log(`cluster has ${this.regions.length} regions, ${this.chains.length} arcs, ${this.nodes.length} nodes`)

        this.check_topology()
    }

    region_containing(p) {
        this.regions.forEach(function(region) {
            if (region.is_inside(p)) return region;
        });
        return null;
    }

    clear_forces() {
        this.chains.forEach(function(chain) {
            chain.vertices.forEach(function(vertex) {
                vertex.force.x = 0.0;
                vertex.force.y = 0.0;
            });
        });
    }

    compute_forces() {
        this.clear_forces();

        this.chains.forEach(chain => {
            // var ds = chain.length() / (chain.vertices.length-1);
            // curvature
            
            if (chain.signed_regions.length === 0) return

            for(var i=1; i<chain.vertices.length; ++i) {
                const v = chain.vertices[i-1];
                const w = chain.vertices[i];

                const fx = (w.x-v.x);
                const fy = (w.y-v.y);

                v.force.x += fx;
                v.force.y += fy;
                w.force.x -= fx;
                w.force.y -= fy;
            }
            
            if (true) {
                // pressure
                var p = 0.0;
                chain.signed_regions.forEach(([sign, region]) => {
                    p += sign * region.pressure
                })
                const n = chain.vertices.length;
                for (var i=1; i<n-1; ++i) {
                    const v = chain.vertices[i>0?i-1:i];
                    const z = chain.vertices[i];
                    const w = chain.vertices[i<n-1?i+1:i];
                    const fx = w.y-v.y;
                    const fy = v.x-w.x;
                    const l = Math.sqrt(Math.pow(fx,2) + Math.pow(fy,2));

                    z.force.x += p*fx/l;
                    z.force.y += p*fy/l;
                }
            }
        });
    }

    equalize() {
        this.chains.forEach(chain => {
            const n = chain.vertices.length-1;
            if (this.ds * (n+1) < chain.length()) {
                // add one more segment
                const k = Math.floor(Math.random()*(n-1));
                const v = chain.vertices[k]; // insert between this
                const w = chain.vertices[k+1]; // and this
                chain.vertices.splice(k+1, 0, new Vertex((v.x+w.x)/2, (v.y+w.y)/2));
            } else if (n>1 && this.ds * (n-1) > chain.length()) {
                const k = Math.floor(Math.random()*(n-1));
                chain.vertices.splice(k+1, 1);
            }
        });

    }

    evolve(dt) {
        this.regions.forEach(function(region){
            region.area_prev = region.area();
        });

        // move vertices along forces
        this.each_vertex(vertex => vertex.evolve(dt));

        this.invalidate_deep();

        // center
        var v = new Vec(Infinity, Infinity);
        var w = new Vec(-Infinity, -Infinity);
        this.each_vertex(vertex => {
            v.x = Math.min(v.x, vertex.x);
            v.y = Math.min(v.y, vertex.y);
            w.x = Math.max(w.x, vertex.x);
            w.y = Math.max(w.y, vertex.y);
        });
        v.add(w);
        v.div(2);
        this.each_vertex(vertex => vertex.sub(v));

        this.equalize();

        // update pressures
        this.regions.forEach(function (region) {
            region.pressure = (region.area_target - region.area())/region.area_target;
        });

        this.compute_forces();
    }

    add_chain(chain) {
        // add chain to cluster as separate dangling component
        this.chains.push(chain)
        this.nodes.push(chain.vertex_start())
        if (chain.vertex_end() !== chain.vertex_start()) this.nodes.push(chain.vertex_end())
    }

    pinch_vertices(vertex1, vertex2) {
        // replace vertex2 with vertex1 in every chain I belong to
        // then vertex2 can be abandoned
        while(vertex2.signed_chains.length>0) {
            let [sign, chain] = vertex2.signed_chains.pop()
            vertex1.signed_chains.push([sign, chain])
            if (chain.vertices[0] === vertex2) chain.vertices[0] = vertex1
            const last = chain.vertices.length - 1
            if (chain.vertices[last] === vertex2) chain.vertices[last] = vertex1
            chain.invalidate()
        }
        this.nodes = this.nodes.filter( v => v!== vertex2)
    }


    graft_chain(chain) {
        // 0. in case this is the first chain 
        // make a closed loop

        if (this.regions.length === 0) {
            this.pinch_vertices(chain.vertex_start(), chain.vertex_end())
            let area = chain.area()
            let sign = area > 0 ? 1 : -1  
            let region = new Region()
            region.cluster = this
            region.signed_chains = [ [sign, chain] ]
            chain.signed_regions.push([sign, region])
            region.area_target = area
            this.regions.push(region)
            return
        }

        // 1. find the region we are in 
        let region = null
        let v = chain.vertices[Math.floor(chain.vertices.length/2)]
        this.regions.some(r => {
            if (region === null && r.is_inside(v)) {
                region = r
                return true
            }
        })

        // utility function
        function find_closest(chains, p) {
            var dist = Infinity;
            var chain = null;
            var idx = null

            chains.forEach(chain_ => {
                for(let i=1; i<chain_.vertices.length-1; ++i) {
                    const v = chain_.vertices[i]
                    const d = vec_distance(v, p);
                    if (d < dist) {
                        dist = d
                        chain = chain_
                        idx = i 
                    }
                }
            });
            return {dist, chain, idx};
        }

        if (region === null) {
            // subdivide external region

            // 2. find the closest vertices to chain end-points
            let chains = this.chains.filter(chain => chain.signed_regions.length>0)
            let start = find_closest(chains, chain.vertex_start())
            // start = { dist, chain, idx }
            start = start.chain.split(start.idx, this)
            // start = { chain1, node, chain2 }
            start = start.node
            this.pinch_vertices(start, chain.vertex_start())

            let end = find_closest(chains, chain.vertex_end())
            // end = { dist, chain, idx }
            end = end.chain.split(end.idx, this)
            // end = { chain1, node, chain2 }
            end = end.node
            this.pinch_vertices(end, chain.vertex_end())

            // 3. find the external region
            let signed_chains = this.chains
                .filter(chain => (chain.signed_regions.length === 1))
                .map(chain => ([ -chain.signed_regions[0][0], chain ]))
            let path1 = locate_path(signed_chains, end, start, 1)
            let path2 = locate_path(signed_chains, end, start, -1)
            let area1 = path_area(path1)
            let area2 = path_area(path2) 
            let area = chain.area()
            if (Math.abs(area1+area) > Math.abs(area2+area)) {
                // chose path2
                path1 = path2
                area1 = area2
            }

            path1.push([1, chain])
            
            if (area1+area<0) {
                // revert path
                path1 = path1.map(([sign, chain]) => ([-sign, chain]))
            }
            let region = new Region()
            region.cluster = this
            this.regions.push(region)
            region.area_target = Math.abs(area1+area)
            region.signed_chains = path1
            path1.forEach(([sign, chain]) => {
                chain.signed_regions.push([sign, region])
            })
        } else {
            // subdivide region

            // 2. find the closest vertices to chain end-points
            let chains = region.signed_chains.map(([sign, chain]) => chain)
            let start = find_closest(chains, chain.vertex_start())
            // start = { dist, chain, idx }
            start = start.chain.split(start.idx, this)
            // start = { chain1, node, chain2 }
            this.pinch_vertices(start.node, chain.vertex_start())

            let end = find_closest(chains, chain.vertex_end())
            // end = { dist, chain, idx }
            end = end.chain.split(end.idx, this)
            // end = { chain1, node, chain2 }
            this.pinch_vertices(end.node, chain.vertex_end())

            region.split(chain)
        }
    }

    info() {
        function join(signed_elements) {
            return signed_elements.map(([sign, el]) => sign*el.id).join(' ')
        }

        let info = []

        this.regions.forEach(region => {if (!region.id) region.id = this.id_region++})
        this.chains.forEach(chain => {if (!chain.id) chain.id = this.id_chain++})
        this.nodes.forEach(vertex => {if (!vertex.id) vertex.id = this.id_vertex++})
        info.push("vertices")
        this.nodes.forEach(vertex => info.push(
            `  ${vertex.id} chains: ${join(vertex.signed_chains)}`))
        info.push("chains")
        this.chains.forEach(chain => info.push(
            `  ${chain.id} vertices: ${chain.vertex_start().id} ${chain.vertex_end().id}  regions: ${join(chain.signed_regions)}`))
        info.push("regions")
        this.regions.forEach(region => info.push(
            `  ${region.id} chains: ${join(region.signed_chains)}`
        ))
        return info.join("\n")
    }

}

