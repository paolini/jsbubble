function $elem(s) {return $(`<${s}></${s}>`);}

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
        const canvas = $("#canvas")[0];
        this.$div = $("#div");
        this.myctx = new MyCtx(0, 0, 10);
        this.myctx.reset_canvas(canvas);
        this.cluster = Cluster.merge(
            double_bubble(0,0, 1,0, 0),
            double_bubble(-2,0,-1, 0.2, 0.1));
        this.cluster.set_targets([1.0, 2.0, 2.5, 3.0]);
    }

    plot() {
        recurse_plot(this.myctx, this.cluster);
    }

    populate_html() {
        this.$div.empty();
        this.$div.append($elem("p").text("length: " + this.cluster.length));
        var $table = $elem("table");
        $table.append($elem("tr")
            .append($elem("th").text("region"))
            .append($elem("th").text("area"))
            .append($elem("th").text("target")));
        this.cluster.regions.forEach((region,i) => {
            let $input = $elem("input").attr("value", region.target)
                .attr("size", 5).change((event) => {
                let target = parseFloat(event.target.value);
                region.target = target;
            });
            $table.append($elem("tr")
                .append($elem("td").text(i))
                .append($elem("td").text(region.area))
                .append($elem("td").append($input)));
        });
        this.$div.append($table);
    }

    update() {
        this.plot();
        this.populate_html();
    }
}

let main = null;

$(() => {
    main = new Main();
    main.update();
});