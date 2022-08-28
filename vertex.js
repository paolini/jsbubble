class Vertex extends Vec {
    constructor(x, y) {
        super(x, y);
        this.force = new Vec(0.0, 0.0);
        this.signed_chains = [] // [sign, chain] if I'm an end-point of chain
    }

    evolve(dt) {
        this.force.clamp(0.1); // speed limit!
        this.x += dt * this.force.x;
        this.y += dt * this.force.y;
    }
}

