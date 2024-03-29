/**
 * Copyright 2021, 2022 Emanuele Paolini (emanuele.paolini@unipi.it)
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 **/

class Vec {
    constructor(x,y) {
        this.x = x;
        this.y = y;
    }

    clamp(maxlen) {
        var l = vec_norm(this);
        if (l>maxlen) {
            this.x *= maxlen/l;
            this.y *= maxlen/l;
        }
    }

    set(v) {
        this.x = v.x;
        this.y = v.y;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
    }

    mul(t) {
        this.x *= t;
        this.y *= t;
    }

    div(t) {
        this.x /= t;
        this.y /= t;
    }
}

function vec_norm(v) {
    return Math.sqrt(v.x*v.x + v.y*v.y);
}

function vec_distance(p, q) {
    // p,q: Vec
    return Math.sqrt((p.x-q.x)*(p.x-q.x) + (p.y-q.y)*(p.y-q.y));
}

function vec_add(v, w) {
    return new Vec(v.x + w.x, v.y + w.y);
}

function vec_sub(v, w) {
    return new Vec(v.x - w.x, v.y - w.y);
}

function vec_mul(v, t) {
    return new Vec(v.x * t, v.y * t);
}

function vec_div(v, t) {
    return new Vec(v.x / t, v.y / t);
}

function vec_angle(v) {
    return Math.atan2(v.y, v.x)
}

function lines_intersect(p0, p1, q0, q1) {
    // return [t0, t1] such that 
    // p0 + t0 * (p1-p0) = q0 + t1 * (q1-q0)
    const det  = (q1.x-q0.x) * (p1.y-p0.y) - (p1.x-p0.x) * (q1.y-q0.y);
    const det0 = (q1.x-q0.x) * (q0.y-p0.y) - (q0.x-p0.x) * (q1.y-q0.y);
    const det1 = (p1.x-p0.x) * (q0.y-p0.y) - (q0.x-p0.x) * (p1.y-p0.y);

    return [det0 / det, det1 / det];
}
