function $elem(s) {return $(`<${s}></${s}>`);}

class Main {
    constructor() {
        const canvas = $("#canvas")[0];
        this.$div = $("#div");
        this.myctx = new MyCtx(0, 0, 10);
        this.myctx.reset_canvas(canvas);
        this.cluster = Cluster.merge(
            double_bubble(0,0, 1,0, 0, "db1"),
            double_bubble(-2,0,-1, 0.2, 0.1, "db2"));
            var regions = this.cluster.regions;
            regions[0].target = 1.0;
            regions[1].target = 2.0;
            regions[2].target = 2.5;
            regions[3].target = 3.0;
            regions.forEach(region => {region.pressure=1.0});
        }
        
    plot() {
        const ctx = this.myctx;
        ctx.clear();
        this.cluster.arcs.forEach(arc => {
            if (arc instanceof Circle) {
                ctx.beginPath();
                ctx.arc(arc.center.x, arc.center.y, arc.radius, 0, 2*Math.PI);
                ctx.stroke();                    
            } else {
                ctx.beginPath();
                if (Math.abs(arc.R) > 10.0) {
                    ctx.moveTo(arc.p1.x, arc.p1.y);
                    ctx.lineTo(arc.p2.x, arc.p2.y);
                } else {
                    ctx.arc(arc.center.x, arc.center.y, Math.abs(arc.R), arc.arc_start_angle, arc.arc_end_angle);
                }
                ctx.stroke(); 
            }
        });
    }

    populate_html() {
        this.$div.empty();
        let $button = $elem("button");
        const set_button_text = () => {
            $button.text(this.loop?"stop":"start");
        };
        set_button_text();
        $button.click(() => {
            this.loop = !this.loop;
            if (this.loop) this.update();
            set_button_text();
        });
        this.$div.append($button);
        this.$div.append($elem("button").text("evolve").click(() => {this.update()}));
        this.$div.append($elem("p").text("length: " + this.cluster.length));
        var $table = $elem("table");
        $table.append($elem("tr")
            .append($elem("th").text("region"))
            .append($elem("th").text("area"))
            .append($elem("th").text("target"))
            .append($elem("th").text("pressure")));
        this.cluster.regions.forEach((region,i) => {
            let $input = $elem("input").attr("value", region.target)
                .attr("size", 5).change((event) => {
                let target = parseFloat(event.target.value);
                region.target = target;
            });
            $table.append($elem("tr")
                .append($elem("td").text(i))
                .append($elem("td").text(region.area))
                .append($elem("td").append($input))
                .append($elem("td").text(region.pressure)));
        });
        this.$div.append($table);
    }

    draw() {
        this.plot();
        this.populate_html();
    }

    update() {
        this.cluster.evolve(0.01);
        this.draw();
        if (this.loop) window.requestAnimationFrame(this.update());
    }

}

let main = null;

$(() => {
    console.log("jsbubble");
    main = new Main();
    main.loop = false;
    main.draw();
});