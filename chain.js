/**
 * Copyright 2021, 2022 Emanuele Paolini (emanuele.paolini@unipi.it)
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 **/

class Chain {
    constructor(vertices) {
        this.id = 0
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

    node(sign) { return sign > 0 ? this.vertex_end() : this.vertex_start() }

    vertices_start_end() { return [ this.vertex_start(), this.vertex_end() ]}

    set_vertex_end(vertex) {
        const end = this.vertices.pop()
        signed_elements_remove(end.signed_chains, -1, this)
        this.vertices.push(vertex)
        vertex.signed_chains.push([-1, this])
    }

    set_vertex_start(vertex) {
        const start = this.vertices[0]
        signed_elements_remove(start.signed_chains, 1, this)
        this.vertices[0] = vertex
        vertex.signed_chains.push([1, this])
    }

    set_vertex(sign, vertex) {
        if (sign > 0) this.set_vertex_start(vertex)
        else this.set_vertex_end(vertex)
    }

    region(sign) {
        const n = this.signed_regions.length
        if (n>2) throw new Error("invalid topology")
        if (n==0) return null
        if (n==1) {
            const [s,region] = this.signed_regions[0]
            if (s!==sign) return null
            return region
        } 
        // n==2
        const [[s0,region0],[s1,region1]] = this.signed_regions
        if (s0*s1>=0) throw new Error("invalid topology")
        return s0 === sign ? region0 : region1
    }

    region_left() { return this.region(1) }

    region_right() { return this.region(-1) }

    regions_left_right() { return [this.region(1), this.region(-1)] }

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
}

