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

    translate(vector) {
        this.x += vector.x;
        this.y += vector.y;
    }

    scaled(q) {
        return new Point(this.x * q, this.y * q);
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }
}

class Vertex extends Point {
    constructor(x,y) {
        super(x,y);
        this.force = new Point(0,0);
    }
}

class CircleOrArc {
    constructor() {
        // denormalized data
        this.left_region = null;
        this.right_region = null;
    }

    get pressure() {
        let k = this.k;
        if (this.left_region !== null) k += this.left_region.pressure;
        if (this.right_region !== null) k -= this.right_region.pressure;
        return k; 
    }
}

class Arc extends CircleOrArc {
    constructor(p1, p2, theta) {
        super();
  
        this.p1 = p1;
        this.p2 = p2;
        this.theta = theta; 
        // angle between arc and segment from p1 to p2
        // positive is arc is on the left of segment
        // (and region on the right is convex)

        // denormalized data
        this.update();
    }

    update() {
        this.L = this.p1.distance_from(this.p2);
        assert (this.L !== 0.0);
        const v = this.p1.vector_to(this.p2).scaled(0.5);
        this.alpha = v.angle();
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
            this.R = 0.5 * this.L / s; // positive if right region is concave
            this.k = 1.0 / this.R;
            const y = this.R * c;
            this.center = this.p1.translated(v).translated(v.perp().scaled(-y*2/this.L));

            // additional info
            this.length = 2.0 * this.R * this.theta
            this.area = 
                0.5 * (this.p1.x - this.p2.x) * (this.p1.y + this.p2.y) // trapezoid
                - this.R * this.R * this.theta // circular sector
                + 0.5 * this.L * y; // triangle
            // info for drawing
            const sign = this.R > 0 ? 1.0 : -1.0;
            this.arc_start_angle = this.alpha + sign * (0.5*Math.PI - this.theta);
            this.arc_end_angle = this.alpha + sign * (0.5*Math.PI + this.theta);
        }
    }

    length() {
        return this.R * Math.sin(this.theta);
    }

    get tangent1() {
        // tangent in p1 towards arc
        let phi = this.alpha + this.theta;
        return new Point(Math.cos(phi), Math.sin(phi));
    }

    get tangent2() {
        // tangent in p2 towards arc (backwards)
        let phi = this.alpha - this.theta + Math.PI;
        return new Point(Math.cos(phi), Math.sin(phi));
    }
}

class Circle extends CircleOrArc {
    constructor (center, radius) {
        super();
        this.center = center;
        this.radius = radius;
        this.update();
    }

    update() {
        this.k = 1.0 / this.radius;
        this.length = 2.0 * Math.PI * this.radius;
        this.area = Math.PI * this.radius * this.radius;
    }
}

class OrientedArc {
    constructor(arc, orientation=1) {
        assert(orientation === 1 || orientation === -1);
        this.arc = arc;
        this.orientation = orientation;
    }

    get k() {
        return -this.orientation * this.arc.k;
    }

    get area() {
        return this.orientation * this.arc.area;
    }

    get is_external() {
        return (this.orientation > 0 ? this.arc.right_region : this.arc.left_region) === null;
    }

    get internal_region() {
        return this.orientation > 0 ? this.arc.left_region : this.arc.right_region;
    }

    set internal_region(region) {
        if (this.orientation > 0) {
            assert(this.arc.left_region === null);
            this.arc.left_region = region;
        } else {
            assert(this.arc.right_region === null);
            this.arc.right_region = region;
        }
    }

    get external_pressure() {
        const external_region = this.orientation > 0 ? this.arc.right_region : this.arc.left_region;
        return external_region === null ? 0.0 : external_region.pressure;
    }

    get length() {
        return this.arc.length;
    }

    get p1() {
        return this.orientation>0 ? this.arc.p1 : this.arc.p2;
    }

    get p2() {
        return this.orientation>0 ? this.arc.p2 : this.arc.p1;
    }

    get tangent1() {
        return this.orientation>0 ? this.arc.tangent1 : this.arc.tangent2;
    }

    get tangent2() {
        return this.orientation>0 ? this.arc.tangent2: this.arc.tangent1;
    }
}

class Region {
    constructor (oriented_arcs) {
        this.oriented_arcs = oriented_arcs;
        this.setup();
        this.pressure = 0.0;
    }

    setup() {
        this.oriented_arcs.forEach(oriented_arc => {
            oriented_arc.internal_region = this;
        });
    }

    get area() {
        var area = 0.0;
        this.oriented_arcs.forEach(oriented_arc => {
            area += oriented_arc.area;
        });
        return area;
    }    

    get average_pressure() {
        let total_k = 0.0;
        let total_l = 0.0;
        this.oriented_arcs.forEach(oriented_arc => {
            const l = oriented_arc.length;
            const k = oriented_arc.k + oriented_arc.external_pressure;
            total_k += k * l;
            total_l += l;
        });
        return total_k / total_l;
    }
}

class Cluster {
    constructor (regions) {
        this.regions = regions;
        this.setup();
    }

    setup() {
        // setup denormalized data

        this.arcs = new Set();
        this.vertices = new Set();

        this.regions.forEach(region => {
            region.oriented_arcs.forEach(oriented_arc => {
                const arc = oriented_arc.arc;
                this.arcs.add(arc);
                if (arc instanceof Arc) {
                    this.vertices.add(arc.p1);
                    this.vertices.add(arc.p2);
                }
            });
        });
    }

    empty() {
        this.regions = [];
        this.setup();
    }

    get length() {
        let length = 0.0;
        this.arcs.forEach(arc => {
            length += arc.length;
        });
        return length;
    }

    static merge(cluster1, cluster2) {
        var regions = cluster1.regions.concat(cluster2.regions);
        cluster1.empty(); 
        cluster2.empty();
        return new Cluster(regions);
    }

    evolve(dt) {
        this.vertices.forEach(vertex => {
            vertex.force.x = 0.0; vertex.force.y = 0.0;
        });
        this.arcs.forEach(arc => {
            if (arc instanceof Circle) return;
            arc.p1.force.translate(arc.tangent1);
            arc.p2.force.translate(arc.tangent2);
        });
        this.vertices.forEach(vertex => {
            vertex.translate(vertex.force.scaled(dt));
        });
        this.arcs.forEach(arc => {
            if (arc instanceof Circle) {
                arc.radius += arc.pressure * dt / arc.length;
            } else {
                arc.theta -= arc.pressure * dt / arc.length;
            }
        });
        this.arcs.forEach(arc => {
            arc.update();
        });
        if (false) {      
            this.regions.forEach(region => {
                region.pressure += dt*(region.target - region.area);
            });
        }
    }
}

function double_bubble(x0, y0, x1, y1, theta, name="bubble") {
    let p1 = new Vertex(x0, y0);
    let p2 = new Vertex(x1, y1);
    let arc = new Arc(p1, p2, theta);
    let arc1 = new Arc(p1, p2, theta + a120);
    let arc2 = new Arc(p1, p2, theta - a120);
    let region1 = new Region([new OrientedArc(arc,1),new OrientedArc(arc1,-1)]); 
    let region2 = new Region([new OrientedArc(arc,-1),new OrientedArc(arc2,1)]);
    p1.name = name + ".p1";
    p2.name = name + ".p2";
    arc.name = name + ".arc";
    arc1.name = name + ".arc1";
    arc2.name = name + ".arc2";
    region1.name = name +".region1";
    region2.name = name + ".region2";
    let cluster = new Cluster([region1, region2]);
    cluster.name = name;
    return cluster;
}
