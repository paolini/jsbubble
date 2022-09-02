class Chain {
    constructor(vertices) {
        console.assert(vertices.length >= 2)
        this.vertices = vertices
        this.vertex_start().signed_chains.push([1, this])
        this.vertex_end().signed_chains.push([-1, this])
        this.signed_regions = []
        this.invalidate()
    }

    toJSON() {
        return `Chain(${this.id || ""})`
    }

    invalidate() {
        this._length = null
        this._area = null
    }

    check_topology() {
        function check_vertex(v, sign) {
            let count = 0
            v.signed_chains.forEach(([sign_, chain]) => {
                if (chain === this) {
                    console.assert(sign_ === sign)
                    count ++
                }
            })
            console.assert(count === 0)
        }
        
        check_vertex(this.vertex_start(), 1)
        check_vertex(this.vertex_end(), -1)

        for (let i=1; i< this.vertices.length - 1; ++i) {
            console.assert(this.vertices[i].signed_chains.length === 0)
        }
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

    vertex_start() { return this.vertices[0] }

    vertex_end() { return this.vertices[this.vertices.length-1] }

    adjacent_node(sign) {
        return sign>0 ? this.vertices[1] : this.vertices[this.vertices.length-2]
    }

    angle_start() { 
        return vec_angle(vec_sub(this.vertices[1],this.vertices[0]))
    }

    angle_end() {
        const n = this.vertices.length
        return vec_angle(vec_sub(this.vertices[n-2],this.vertices[n-1]))
    }

    angle_node(sign) {
        return sign>0 ? this.angle_start() : this.angle_end()
    }

    node(sign) { return sign > 0 ? this.vertex_end() : this.vertex_start() }

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

    split(i, cluster) {
        // split the chain at vertex i
        //
        //      start >--- this ---> end
        //
        // return { chain1, node, chain2 }
        //
        // start >--- chain1 ---> node >--- chain2=this ---> end  

        let start = this.vertices[0]
        let node = this.vertices[i]
        cluster.nodes.push(node)
        let vertices = this.vertices.splice(0,i) // cut first part
        let chain2 = this

        if (start === this.vertex_end() && start.signed_chains.length === 2) {
            // this is a closed detached loop. Instead of splitting 
            // rotate node to be the single vertex

            vertices.push(node) // duplicate node
            this.vertices.pop() // remove one copy of old start
            this.vertices.push(...vertices)
            start.signed_chains = []
            node.signed_chains = [[1, this], [-1, this]]
            array_remove(cluster.nodes, start)
            return node
        }

        signed_elements_remove(start.signed_chains, 1, this)
        node.signed_chains.push([1, this]) 
        vertices.push(node)
        let chain1 = new Chain(vertices)
        cluster.chains.push(chain1)

        chain1.invalidate()
        chain2.invalidate()

        chain2.signed_regions.forEach(([sign, region]) => {
            chain1.signed_regions.push([sign, region])
            region.signed_chains.push([sign, chain1])
        })

        return node
    }
}
