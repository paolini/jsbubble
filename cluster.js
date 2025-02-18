/**
 * Copyright 2021, 2022 Emanuele Paolini (emanuele.paolini@unipi.it)
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 **/

class Cluster {
    constructor(ds, dt) {
        
        this.ds = ds || 0.1 // length of segments
        this.dt = dt || 0.2 // speed of evolution
        
        this.regions = []
        this.chains = []
        this.nodes = []
        this._perimeter = null

        this.id_vertex = 1
        this.id_chain = 1
        this.id_region = 1

        this.fix_topology = true

        this.external_region = null
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
            const r = 1.0 / (ds*ds) 
            const n = chain.vertices.length;

            //if (chain.signed_regions.length === 0) return
            
            // curvature * ds^2
            for(var i=1; i<n; ++i) {
                const v = chain.vertices[i-1];
                const w = chain.vertices[i];

                const fx = (w.x-v.x)*r;
                const fy = (w.y-v.y)*r;

                if (i>0) {
                    v.force.x += fx;
                    v.force.y += fy;
                } 
                w.force.x -= fx;
                w.force.y -= fy;
            }
            
            // pressure
            var p = 0.0;
            chain.signed_regions.forEach(([sign, region]) => {
                p += sign * region.pressure 
            })
            for (var i=1; i<n; ++i) {
                const v = chain.vertices[i-1]
                const w = chain.vertices[i]
                const fx = w.y-v.y
                const fy = v.x-w.x
                const l = 2*Math.sqrt(fx*fx + fy*fy)

                chain.vertices[i-1].force.x += p*fx/l;
                chain.vertices[i-1].force.y += p*fy/l;
                chain.vertices[i].force.x += p*fx/l;
                chain.vertices[i].force.y += p*fy/l;
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
                    let node = this.pinch_vertices(chain.vertex_start(), chain.vertex_end())
                    this.remove_chain(chain)
                    this.split_vertex(node)
                } else if (n>3) {
                    // remove a vertex
                    const k = Math.floor(Math.random()*(n-1));
                    chain.vertices.splice(k+1, 1);
                }
            }
        });

        if (!this.fix_topology) {
            this.nodes.filter(node => (node.signed_chains.length > 3))
                .forEach(node => this.split_vertex(node))
        }

    }

    evolve() {
        this.regions.forEach(function(region){
            region.area_prev = region.area();
        });

        // move vertices along forces
        const tau = this.dt*this.ds*this.ds
        this.each_vertex(vertex => {
            let v = vec_mul(vertex.force, tau)
            //v.clamp(0.05*this.ds)
            if (!vertex.pinned) {
                vertex.x += v.x;
                vertex.y += v.y;
            }
        });

        // move nodes on baricenter
        if (true) {
            this.nodes.forEach(node => {
                if (node.signed_chains.length <= 2) return
                let p = new Vec(0.0, 0.0)
                node.signed_chains.forEach(([sign, chain]) => {
                    p.add(chain.adjacent_node(sign))
                })
                p = vec_div(p, node.signed_chains.length)
                if (!node.pinned) {
                    node.x = p.x
                    node.y = p.y
                }
                // node.set(p)
            }) 
        }

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
        this.regions.forEach(region => {
            region.area_target_plus += 0.01*(region.area_target-region.area())
            region.pressure = 0.9 * region.pressure + 0.1*(region.area_target_plus-region.area())/(this.ds*this.ds) 
            //region.pressure = 0.5*region.pressure + 0.5*Math.sqrt(region.area_target - region.area)/(this.ds*this.ds)
        });

        this.compute_forces();
    }

    add_vertex(v) {
        if (!this.nodes.includes(v)) {
            this.nodes.push(v)
            v.id = this.id_vertex++
        }
        return v
    }

    add_chain(chain) {
        // add chain to cluster as separate dangling component
        chain.vertices.forEach(v => {
            if (v.id === 0) v.id = this.id_vertex++
        })
        this.add_vertex(chain.vertex_start())
        this.add_vertex(chain.vertex_end())
        if (!this.chains.includes(chain)) {
            this.chains.push(chain)
            chain.id = this.id_chain++
        }
        return chain
    }

    remove_chain(chain) {
        array_remove(this.chains, chain)
    }

    add_region(region, external) {
        if (region.cluster === null) {
            region.cluster = this
            this.regions.push(region)
            if (!external) region.id = this.id_region++
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

    add_external_region() {
        if (this.external_region === null) {
            this.external_region = this.add_region(new Region(0.0), true)
            this.chains.forEach(chain => {
                const [left, right] = chain.regions_left_right()
                if (left === null) this.external_region.add_chain(1, chain)
                if (right === null) this.external_region.add_chain(-1, chain)
            })
        }
        return this.external_region
    }

    remove_external_region() { 
        if (this.external_region) {
            this.remove_region(this.external_region)
            this.external_region = null
        }
    }

    remove_chain(chain) {
        chain.signed_regions.forEach(([sign, region]) => {
            signed_elements_remove(region.signed_chains, null, chain)
        })
        chain.signed_regions = []
        signed_elements_remove(chain.vertex_start().signed_chains, null, chain)
        signed_elements_remove(chain.vertex_end().signed_chains, null, chain)
        array_remove(this.chains, chain)
    }

    remove_vertex(v) {
        const signed_chains = v.signed_chains.slice() // copy
        signed_chains.forEach(([sign, chain]) => this.remove_chain(chain))
        array_remove(this.nodes, v)
    }

    simplify_chains() {
        // remove nodes of order 2
        const nodes = this.nodes.filter(node => (
            node.signed_chains.length === 2
            && !node.pinned
            && node.signed_chains[0][1]!==node.signed_chains[1][1]))
        nodes.forEach(node => {
            let [sign0, chain0] = node.signed_chains[0]
            let [sign1, chain1] = node.signed_chains[1]
            if (chain0 === chain1) return // non si può eliminare
            let vertices = chain0.vertices.slice() // copy vertices
            if (sign0 > 0) vertices.reverse()
            console.assert(last(vertices) === node)
            vertices.pop()
            if (sign1 > 0) {
                vertices.push(...chain1.vertices)
            } else {
                // reverse
                for (let i=chain1.vertices.length;i>0;) {
                    --i
                    vertices.push(chain1.vertices[i])
                }
            }
            let chain = this.add_chain(new Chain(vertices))
            chain0.signed_regions.forEach(([s,region]) => {
                chain.signed_regions.push([-s*sign0, region])
                region.signed_chains.push([-s*sign0, chain])
            })
            this.remove_vertex(node)
        })
    }

    simplify_vertices() {
        // remove isolated vertices
        let nodes = this.nodes.filter(node => (node.signed_chains.length === 0)) // copy
        nodes.forEach(node => this.remove_vertex(node))
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

    collapse_chain(chain) {
        const [start, end] = chain.vertices_start_end()
        if (start === end) {
            this.remove_chain(chain)
            this.simplify_vertices()
            return null
        }
        const vertex = this.pinch_vertices(start, end)
        this.remove_chain(chain)
        return vertex
    }

    flip_chain(chain) {
        // to fix the ideas suppose chain goes West to East
        const [vertex_W, vertex_E] = chain.vertices_start_end()
        if (vertex_W.signed_chains.length < 3 || vertex_E.signed_chains.length < 3) return null
        if (chain.signed_regions.length !== 2) this.add_external_region()
        if (chain.signed_regions.length !== 2) throw new Error("invalid topology")
        const [region_N, region_S] = chain.regions_left_right()
        const nw = region_N.signed_chain_next(-1, vertex_W)
        const ne = region_N.signed_chain_next(1, vertex_E)
        if (nw === null || ne === null) throw new Error("invalid topology")
        const region_W = nw[1].region(-nw[0])
        const region_E = ne[1].region(-ne[0]) 

        // new chain will have the NW and NE regions
        // (in case vertices have more than 3 regions)

        // new vertices arbitrarily coincide with old ones
        const vertex_N = this.add_vertex(new Vertex(vertex_W.x, vertex_W.y))
        const vertex_S = this.pinch_vertices(vertex_E, vertex_W)
        
        // attach nw and ne to new vertex
        nw[1].set_vertex(-nw[0], vertex_N)
        ne[1].set_vertex(ne[0], vertex_N)

        // flip chain
        chain.set_vertex_start(vertex_N)
        chain.set_vertex_end(vertex_S)

        // remove old regions from chain
        region_N.add_chain(-1, chain)
        region_S.add_chain(1, chain)

        // add new regions
        if (region_W) region_W.add_chain(-1, chain)
        if (region_E) region_E.add_chain(1, chain)

        this.remove_external_region()

        if (chain.signed_regions.length === 0) {
            this.remove_chain(chain)
            this.simplify_chains()
            this.simplify_vertices()
        }
    }

    split_region(region, chain) {
        let area = region.area()
        const [start, end] = chain.vertices_start_end()
        let path = locate_path(region.signed_chains, end, start, 1)
        if (path === null) throw new Error("invalid topology")
        path.push([1, chain])

        // choose smallest of two parts
        let a = path_area(path) 
        let sign =  a / area < 0.5 ? 1 : - 1 // SIC! Even when area < 0
        let new_region = this.add_region(new Region())

        if (sign < 0) {
            path = locate_path(region.signed_chains, start, end, 1)
            if (path === null) throw new Error("invalid topology")
            path.push([-1, chain])
        }
        
        path.forEach(([s, chain]) => {
            new_region.add_chain(s, chain)
            region.add_chain(-s, chain)
        })
        
        region.invalidate()
        
        // subdivide target_area proportionally
        if (region.area_target > 0) {
            let ratio = area / region.area_target
            region.set_target(ratio * region.area())
            new_region.set_target(ratio * new_region.area())
        } else {
            new_region.set_target(new_region.area())
        }      

        return new_region
    }

    split_vertex(vertex) {
        // if there are at least 4 chains joining in the vertex
        // find the smallest angle and add a small chain and a triple point

        if (vertex.signed_chains.length < 4) return

        let angle_signed_chains = vertex.signed_chains.map(([sign, chain]) => ([chain.angle_node(sign), [sign, chain]]))
        angle_signed_chains.sort((a,b) => (a[0]-b[0]))
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

        let [sign1, chain1] = angle_signed_chains[best_i][1]
        let [sign2, chain2] = angle_signed_chains[(best_i+1)%n][1]

        let v = this.add_vertex(new Vertex(vertex.x, vertex.y))
        let chain = this.add_chain(new Chain([vertex, v]))
        
        let operate_on = (sign1, chain1) => {
            let new_chain1 = this.add_chain(new Chain(chain1.vertices.slice()))
            v.add(chain1.adjacent_node(sign1))
            new_chain1.set_vertex(sign1, v)
            chain1.signed_regions
                .map(x => x) // need to clone
                .forEach(([s,r]) => {
                    const ss = s*sign1

                    r.add_chain(-s,chain1)
                    r.add_chain(s,new_chain1)
                    r.add_chain(s*sign1,chain)
            })
            if (chain1.signed_regions.length === 0) this.remove_chain(chain1)
        }
        operate_on(sign1,chain1)
        operate_on(sign2,chain2)        
        v.div(3)
    }

    split_chain(chain, idx) {
        // split the chain at vertex i
        //
        //      start >--- this ---> end
        //
        // return { chain1, node, chain2 }
        //
        // start >--- chain1 ---> node >--- chain2=this ---> end  

        let node = chain.vertices[idx]
        let start = chain.vertices[0]
        this.add_vertex(node)

        let vertices = chain.vertices.splice(0,idx) // cut first part
        let chain2 = chain

        if (start === chain.vertex_end() && start.signed_chains.length === 2) {
            // chain is a closed detached loop. Instead of splitting 
            // rotate node to be the single vertex

            vertices.push(node) // duplicate node
            chain.vertices.pop() // remove one copy of old start
            chain.vertices.push(...vertices)
            start.signed_chains = []
            node.signed_chains = [[1, chain], [-1, chain]]
            array_remove(this.nodes, start)
            return node
        }

        signed_elements_remove(start.signed_chains, 1, chain)
        node.signed_chains.push([1, chain]) 
        vertices.push(node)
        let chain1 = new Chain(vertices)
        this.add_chain(chain1)

        chain1.invalidate()
        chain2.invalidate()

        chain2.signed_regions.forEach(([sign, region]) => {
            chain1.signed_regions.push([sign, region])
            region.signed_chains.push([sign, chain1])
        })

        return node
    }

    graft_chain(chain) {
        // 0. in case this is the first chain 
        // make a closed loop

        if (this.regions.length === 0) {
            this.pinch_vertices(chain.vertex_start(), chain.vertex_end())
            let area = chain.area()
            let sign = area > 0 ? 1 : -1  
            let region = this.add_region(new Region())
            region.add_chain(sign, chain)
            region.set_target(Math.abs(area))
            return region
        } else {
            // 1. find the region we are in 
            const v = chain.vertices[Math.floor(chain.vertices.length/2)]
            const region = some(this.regions,r => {if (r.is_inside(v)) return r}) 
                || this.add_external_region() 

            // subdivide region

            // 2. find the closest vertices to chain end-points
            let chains = region.signed_chains.map(([sign, chain]) => chain)
            let start = find_closest_vertex(chains, chain.vertex_start())
            // start = { dist, chain, idx }
            if (start.chain === null) return null
            start = this.split_chain(start.chain, start.idx)
            this.pinch_vertices(start, chain.vertex_start())

            // compute chains again...
            chains = region.signed_chains.map(([sign, chain]) => chain)
            let end = find_closest_vertex(chains, chain.vertex_end())
            // end = { dist, chain, idx }
            if (end.chain === null) return null
            end = this.split_chain(end.chain,end.idx)
            this.pinch_vertices(end, chain.vertex_end())
            const new_region = this.split_region(region, chain)
            if (region === this.external_region) {
                new_region.set_target(new_region.area())
            }
            this.remove_external_region()
            return new_region
        }
    }

    info() {
        function join(signed_elements) {
            return signed_elements.map(([sign, el]) => sign*el.id).join(' ')
        }

        let info = []

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

    json() {
        let vertices = new Map() // id => vertex
        this.chains.forEach(chain => {
            chain.vertices.forEach(vertex => {
                vertices.set(vertex.id, vertex)
            })
        })
        let vertex_ids = Array.from(vertices.keys())
        vertex_ids.sort()
        const nodes = vertex_ids.map(id => vertices.get(id))
            .map(v => [v.id, round(v.x), round(v.x)])
        const chains = this.chains.map(chain => {
            let lst = chain.vertices.map(v => v.id)
            lst.unshift(chain.id)
            return lst
        })
        const regions = this.regions.map(region => ([
            region.id,
            round(region.area_target),
            region.signed_chains.map(([s,c]) => s*c.id)
        ]))
        return { nodes, chains, regions }
    }

}

