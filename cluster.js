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

        this.fix_topology = true
    }

    toJSON() {
        return this.info()
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
            const ds = chain.length() / (chain.vertices.length-1)
            const r = (this.ds*this.ds)/(ds*ds) 

            if (chain.signed_regions.length === 0) return
            
            // curvature * ds^2
            for(var i=1; i<chain.vertices.length; ++i) {
                const v = chain.vertices[i-1];
                const w = chain.vertices[i];

                const fx = (w.x-v.x)*r;
                const fy = (w.y-v.y)*r;

                if (i>1) {
                    v.force.x += fx;
                    v.force.y += fy;
                } 
                if (i<chain.vertices.length-1) {
                    w.force.x -= fx;
                    w.force.y -= fy;
                }
            }
            
            // pressure
            var p = 0.0;
            chain.signed_regions.forEach(([sign, region]) => {
                p += sign * region.pressure
            })
            // var ds = chain.length() / (chain.vertices.length-1);
            if (Math.abs(p) > this.ds) p *= this.ds / Math.abs(p)
            const n = chain.vertices.length;
            for (var i=1; i<n-1; ++i) {
                const v = chain.vertices[i>0?i-1:i];
                const z = chain.vertices[i];
                const w = chain.vertices[i<n-1?i+1:i];
                const fx = w.y-v.y;
                const fy = v.x-w.x;
                const l = Math.sqrt(fx*fx + fy*fy);

                z.force.x += p*fx/l;
                z.force.y += p*fy/l;
            }
        })
    }

    equalize() {
        this.chains.forEach(chain => {
            const n = chain.vertices.length-1;
            const l = chain.length()
            if (n < 3 || this.ds * (n+1) < l) {
                // add one more segment
                const k = Math.floor(Math.random()*(n-1));
                const v = chain.vertices[k]; // insert between this
                const w = chain.vertices[k+1]; // and this
                chain.vertices.splice(k+1, 0, new Vertex((v.x+w.x)/2, (v.y+w.y)/2));
            } else if (this.ds * (n-1) > l) {
                if (l < this.ds && !this.fix_topology) {
                    console.log("MERGE")
                    console.log(this.info())
                    dump({ n1: chain.vertex_start().signed_chains.length,
                        n2: chain.vertex_end().signed_chains.length })
                    let node = this.pinch_vertices(chain.vertex_start(), chain.vertex_end())
                    dump({n: node.signed_chains.length })
                    this.remove_chain(chain)
                    dump({n: node.signed_chains.length })
                    console.log(this.info())
                    this.split_vertex(node)
                } else if (n>3) {
                    const k = Math.floor(Math.random()*(n-1));
                    chain.vertices.splice(k+1, 1);
                }
            }
        });

    }

    evolve(dt) {
        this.regions.forEach(function(region){
            region.area_prev = region.area();
        });

        // move vertices along forces
        this.each_vertex(vertex => vertex.evolve(dt));

        // move nodes on baricenter
        this.nodes.forEach(node => {
            let p = new Vec(0.0, 0.0)
            node.signed_chains.forEach(([sign, chain]) => {
                p.add(chain.adjacent_node(sign))
            })
            p = vec_div(p, node.signed_chains.length)
            node.x = p.x
            node.y = p.y
            // node.set(p)
        }) 

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

    add_vertex(v) {
        if (!this.nodes.includes(v)) this.nodes.push(v)
        return v
    }

    add_chain(chain) {
        // add chain to cluster as separate dangling component
        this.add_vertex(chain.vertex_start())
        this.add_vertex(chain.vertex_end())
        if (!this.chains.includes(chain)) this.chains.push(chain)
        return chain
    }

    add_region(region) {
        if (region.cluster === null) {
            region.cluster = this
            this.regions.push(region)
        }
        if (region.cluster !== this) {
            console.log("CANNOT ADD REGION")
            return null
        }
        region.signed_chains.forEach(([sign, chain]) => this.add_chain(chain))
        if (region.cluster === null) 
        if (!this.regions.includes(region)) this.regions.push(region)
        return region
    }

    remove_region(region) {
        region.clear()
        array_remove(this.regions, region)
        region.cluster = null
    }

    remove_chain(chain) {
        if (chain.vertex_start() === chain.vertex_end()) {
            // regions are preserved
            chain.signed_regions.forEach(([sign, region]) => {
                signed_elements_remove(region.signed_chains, null, chain)
            })
            chain.signed_regions = []
        } else {
            // must destroy regions
            chain.signed_regions.forEach(([sign, region]) => {
                this.remove_region(region)
            })
        }
        signed_elements_remove(chain.vertex_start().signed_chains, null, chain)
        signed_elements_remove(chain.vertex_end().signed_chains, null, chain)
        array_remove(this.chains, chain)
    }

    remove_vertex(v) {
        v.signed_chains.forEach(([sign, chain]) => this.remove_chain(chain))
        array_remove(this.nodes, v)
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
        array_remove(this.nodes, vertex2)
        return vertex1
    }

    split_vertex(vertex) {
        // if there are at least 4 chains joining in the vertex
        // find the smallest angle and add a small chain and a triple point

        if (vertex.signed_chains.length < 4) return

        let angle_signed_chains = vertex.signed_chains.map(([sign, chain]) => ([chain.angle_node(sign), [sign, chain]]))
        dump({ angle_signed_chains })
        angle_signed_chains.sort((a,b) => (a[0]-b[0]))
        dump({ angle_signed_chains })
        let best_a = Infinity
        let best_i = null
        const n = angle_signed_chains.length
        for (let i=0; i<n; ++i) {
            let a = Math.abs(angle_signed_chains[(i+1)%n][0] - angle_signed_chains[i][0])
            if (a > Math.PI) a = 2*Math.PI - a
            if (a < best_a) {
                best_a = a
                best_i = i
            }
        }
        dump({best_a, best_i})

        let [sign1, chain1] = angle_signed_chains[best_i][1]
        let [sign2, chain2] = angle_signed_chains[(best_i+1)%n][1]

        let v = this.add_vertex(new Vertex(vertex.x, vertex.y))
        let chain = this.add_chain(new Chain([vertex, v]))

        let m = new Vec(vertex.x, vertex.y)
        let region_signs = new Map()

        function replace_vertex(sign, chain) {
            signed_elements_remove(vertex.signed_chains, sign, chain)
            v.signed_chains.push([sign, chain])
            if (sign > 0) {
                chain.vertices[0] = v
                m = vec_add(m, chain.vertices[1])
            } else {
                const n = chain.vertices.length - 1
                chain.vertices[n] = v
                m = vec_add(m, chain.vertices[n-1])
            }
            chain.signed_regions.forEach(([s, region]) => {
                region.signed_chains.push([s, chain])
                if (region_signs.has(region)) {
                    region_signs.set(region, region_signs.get(region) + s*sign)
                } else {
                    region_signs.set(region, s*sign)
                }    
            })
        }

        replace_vertex(sign1, chain1)
        replace_vertex(sign2, chain2)

        // move v slightly towards the two chains
        m = vec_div(m, 3)
        v.x = m.x
        v.y = m.y

        region_signs.forEach((sign, region) => {
            if (sign !== 0) chain.signed_regions.push([sign, region])
        })
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
            region.area_target = Math.abs(area)
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
            let dist = Infinity
            let chain = null
            let idx = null

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

            if (false && vec_distance(chain.vertex_start(),chain.vertex_end()) < start.dist) {
                // close chain instead of merging
                this.pinch_vertices(chain.vertex_start(), chain.vertex_end())
                let region = new Region()
                this.regions.push(region)
                region.cluster = this
                let sign = chain.area() > 0 ? 1 : -1
                region.signed_chains.push([sign, chain])
                chain.signed_regions.push([sign,region])
                region.area_target = region.area()
                return
            }

            // start = { dist, chain, idx }
            start = start.chain.split(start.idx, this)
            this.pinch_vertices(start, chain.vertex_start())

            let end = find_closest(chains, chain.vertex_end())
            // end = { dist, chain, idx }
            end = end.chain.split(end.idx, this)
            this.pinch_vertices(end, chain.vertex_end())

            // 3. find the external region
            let signed_chains = this.chains
                .filter(chain => (chain.signed_regions.length === 1))
                .map(chain => ([ -chain.signed_regions[0][0], chain ]))

            // console.log(this.info())
            let path1 = locate_path(signed_chains, end, start, 1)
            // dump({path1})
            let path2 = locate_path(signed_chains, end, start, -1)
            // dump({path2})
            if ( path1 !== null && path2 !== null) {
                let area = chain.area()
                let area1 = path_area(path1)
                let area2 = path_area(path2) 
                if (Math.abs(area1+area) > Math.abs(area2+area)) {
                    // chose path2
                    path1 = path2
                }
            } else if (path1 === null && path2 !== null) {
                path1 = path2
            } else {
                console.log(this.info())
                console.log("CANNOT LOCATE EXTERNAL PATH")
                return
            }

            path1.push([1, chain])
            
            let area = path_area(path1)

            if (area<0) {
                // revert path
                path1 = path1.map(([sign, chain]) => ([-sign, chain]))
            }
            let region = new Region()
            region.cluster = this
            this.regions.push(region)
            region.area_target = Math.abs(area)
            region.signed_chains = path1
            path1.forEach(([sign, chain]) => {
                chain.signed_regions.push([sign, region])
            })
            return region
        } else {
            // subdivide region

            // 2. find the closest vertices to chain end-points
            let chains = region.signed_chains.map(([sign, chain]) => chain)
            let start = find_closest(chains, chain.vertex_start())
            // start = { dist, chain, idx }
            start = start.chain.split(start.idx, this)
            this.pinch_vertices(start, chain.vertex_start())

            let end = find_closest(chains, chain.vertex_end())
            // end = { dist, chain, idx }
            end = end.chain.split(end.idx, this)
            this.pinch_vertices(end, chain.vertex_end())

            return region.split(chain)
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

