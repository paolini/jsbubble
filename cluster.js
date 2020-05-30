const a120 = Math.PI / 1.5; 

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    distance_from(other_point) {
        const sqr = (x => x*x);
        return Math.sqrt(sqr(other_point.x-this.x) + sqr(other_point.y-this.y));
    }

    vector_to(other_point) {
        return new Point(other_point.x - this.x, other_point.y - this.y);
    }

    perp() {
        // rotated by 90-degrees counterclockwise
        return new Point(-this.y, this.x);
    }

    translated(vector) {
        return new Point(this.x + vector.x, this.y + vector.y);
    }

    scaled(q) {
        return new Point(this.x * q, this.y * q);
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }
}

class Arc {
    constructor(p1, p2, theta) {
        this.p1 = p1;
        this.p2 = p2;
        this.theta = theta;

        // denormalized data
        this.oriented_arc = null;
        this.backward_oriented_arc = null;
        this.left_component = null;
        this.right_component = null;
        this.update();
    }

    update() {
        this.L = p1.distance_from(p2);
        assert (this.L !== 0.0);
        if (this.theta === 0.0) {
            this.R = Infinity;
            this.k = 0.0;
            this.center = null;

            // additional info
            this.length = this.L;
            this.area = 0.5 * (this.p1.x - this.p2.x) * (this.p1.y + this.p2.y); // trapezoid
        } else {
            const s = Math.sin(this.theta);
            const c = Math.cos(this.theta);
            this.R = 0.5 * this.L / s;
            this.k = 1.0 / this.R;
            const v = this.p1.vector_to(this.p2).scaled(0.5);
            const y = this.R * c;
            this.center = this.p1.translated(v).translated(v.perp().scaled(-y*2/this.L));

            // additional info
            this.length = 2.0 * this.R * this.theta
            this.area = 
                0.5 * (this.p1.x - this.p2.x) * (this.p1.y + this.p2.y) // trapezoid
                - this.R * this.R * this.theta // circular sector
                + 0.5 * this.L * y; // triangle
            // info for drawing
            const alpha = v.angle();
            const sign = this.R > 0 ? 1.0 : -1.0;
            this.arc_start_angle = alpha + sign * (0.5*Math.PI - this.theta);
            this.arc_end_angle = alpha + sign * (0.5*Math.PI + this.theta);
        }
    }

    get_oriented_arc() {
        if (this.oriented_arc !== null) return this.oriented_arc;
        return new OrientedArc(this, 1);
    }

    get_backward_oriented_arc() {
        if (this.backward_oriented_arc !== null) return this.backward_oriented_arc;
        return new OrientedArc(this, -1);
    }

    length() {
        return this.R * Math.sin(this.theta);
    }
}

class OrientedArc {
    constructor(arc, orientation=1) {
        assert(orientation === 1 || orientation === -1);
        if (orientation > 0) {
            assert(arc.oriented_arc === null);
            arc.oriented_arc = this;
        } else {
            assert(arc.backward_oriented_arc === null);
            arc.backward_oriented_arc = this;
        }
        this.arc = arc;
        this.orientation = orientation;
    }

    get area() {
        return this.orientation * this.arc.area;
    }

    get backward_arc() {
        return this.orientation > 0 ? this.arc.backward_oriented_arc : this.arc.oriented_arc;
    }

    get is_external() {
        return this.backward_arc === null;
    }

    get length() {
        return this.is_external ? this.arc.length : 0.5 * this.arc.length;
    }

    get p1() {
        return this.orientation>0 ? this.arc.p1 : this.arc.p2;
    }

    get p2() {
        return this.orientation>0 ? this.arc.p2 : this.arc.p1;
    }

    is_next_of(other_oriented_arc) {
        return other_oriented_arc.p1 === this.p2;
    }
}

class Component {
    constructor (oriented_arcs) {
        this.oriented_arcs = oriented_arcs;
        this.region = null;
        this.check();
    }

    check() {
        for (var i=0; i<this.oriented_arcs.length-1; ++i) {
            var j = i+1;
            if (j>=this.oriented_arcs.length) j=0;
            assert(this.oriented_arcs[j].is_next_of(this.oriented_arcs[i]));
        }
    }

    to_region() {
        if (this.region !== null) return this.region;
        return new Region([this]);
    }

    get length() {
        var length = 0.0;
        this.oriented_arcs.forEach(oriented_arc => {
            length += oriented_arc.length;
        });
        return length;
    }

    get area() {
        var area = 0.0;
        this.oriented_arcs.forEach(oriented_arc => {
            area += oriented_arc.area;
        });
        return area;
    }
    
}

class CircleComponent extends Component {
    constructor (center, radius) {
        this.center = center;
        this.radius = radius;
    }

    get length() {
        return 2.0 * Math.PI * this.radius;
    }

    get area() {
        return Math.PI * this.radius * this.radius;        
    }
}

class Region {
    constructor (components) {
        this.components = components;
        this.components.forEach(component => {
            assert(component.region === null);
            component.region = this;
        })
    }

    get length() {
        var length = 0.0;
        this.components.forEach(component => {
            length += component.length;
        })
        return length;
    }

    get area() {
        var area = 0.0;
        this.components.forEach(component => {
            area += component.area;
        })
        return area;
    }
}

class Cluster {
    constructor (regions) {
        this.regions = regions;
    }

    get length() {
        let length = 0.0;
        this.regions.forEach(region => {
            length += region.length;
        })
        return length;
    }

    get areas() {
        return this.regions.map(region => region.area); 
    }

    set_targets(areas) {
        assert(areas.length === this.regions.length);
        this.regions.forEach((region, i) => {region.target = areas[i]});
    }

    static merge(cluster1, cluster2) {
        var regions = cluster1.regions.concat(cluster2.regions);
        cluster1.regions = []; // cluster1 diventa vuoto
        cluster2.regions = []; // cluster2 diventa vuoto
        return new Cluster(regions);
    }
}

function double_bubble(x0, y0, x1, y1, theta) {
    p1 = new Point(x0, y0);
    p2 = new Point(x1, y1);
    arc = new Arc(p1, p2, theta);
    arc1 = new Arc(p1, p2, theta + a120);
    arc2 = new Arc(p1, p2, theta - a120);
    component1 = new Component([arc.get_oriented_arc(),arc1.get_backward_oriented_arc()]); 
    component2 = new Component([arc.get_backward_oriented_arc(),arc2.get_oriented_arc()]);
    return new Cluster([
       component1.to_region(),
       component2.to_region()]);
}
