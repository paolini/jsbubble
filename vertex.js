/**
 * Copyright 2021, 2022 Emanuele Paolini (emanuele.paolini@unipi.it)
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 **/

class Vertex extends Vec {
    constructor(x, y) {
        super(x, y);
        this.id = 0
        this.force = new Vec(0.0, 0.0);
        this.signed_chains = [] // [sign, chain] if I'm an end-point of chain
    }

    evolve(dt) {
        this.force.clamp(0.1); // speed limit!
        this.x += dt * this.force.x;
        this.y += dt * this.force.y;
    }

    toJSON() {
        return `Vertex(${this.id || ""})`
    }
}

