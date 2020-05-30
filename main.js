function recurse_plot(ctx, element) {
    if (element instanceof Arc) {
        ctx.beginPath();
        if (element.k === 0.0) {
            ctx.moveTo(element.p1.x, element.p1.y);
            ctx.lineTo(element.p2.x, element.p2.y);
        } else {
            ctx.arc(element.center.x, element.center.y, Math.abs(element.R), element.arc_start_angle, element.arc_end_angle);
        }
        ctx.stroke(); 
    } else if (element instanceof OrientedArc) {
        recurse_plot(ctx, element.arc);
    } else if (element instanceof Component) {
        element.oriented_arcs.forEach(oriented_arc => recurse_plot(ctx, oriented_arc));
    } else if (element instanceof CircleComponent) {
        ctx.beginPath();
        ctx.arc(element.center.x, element.center.y, element.radius, 0, 2*Math.PI);
        ctx.stroke();
    } else if (element instanceof Region) {
        element.components.forEach(component => recurse_plot(ctx, component));
    } else if (element instanceof Cluster) {
        element.regions.forEach(region => recurse_plot(ctx, region));
    } else {
        assert(false);
    }
}

class Main {
    constructor() {
        const canvas = document.getElementById("canvas");
        /*
        var ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(100,100,100,-0.5,3.5);
        ctx.stroke();
        */
        this.myctx = new MyCtx(0, 0, 10);
        this.myctx.reset_canvas(canvas);
        /*
        myctx.beginPath();
        myctx.arc(0,0,2,-0.5,3.5);
        myctx.stroke();
        */
        this.cluster = Cluster.merge(
            double_bubble(0,0, 1,0, 0),
            double_bubble(-2,0,-1, 0.2, 0.1));
    }

    plot() {
        recurse_plot(this.myctx, this.cluster);
    }
}

document.addEventListener("DOMContentLoaded",function(){
    new Main().plot();
});