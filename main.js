function $elem(s) {return $(`<${s}></${s}>`);}

class Main {
    constructor() {
        const canvas = $("#canvas")[0];
        this.$div = $("#div");
        this.myctx = new MyCtx(0, 0, 10);
        this.myctx.reset_canvas(canvas);
        this.cluster = new Cluster();
        if (false) {
            this.cluster.add_bubble(new Vec(0.0, 0.0), 1);
            this.cluster.add_bubble(new Vec(2.0, 0.0), 1.5);
        } else {
            this.cluster.add_n_bubble(new Vec(0,0), 1.0, 3);
        }
        var self = this;
        canvas.addEventListener("mousemove", function(evt){
            self.mousemove(evt);
        }, false);
        this.draw_vertices = 1;
    }
        
    plot() {
        const ctx = this.myctx;
        ctx.clear();
        ctx.setStrokeColor("blue");
        if (0) {
            ctx.beginPath();
            ctx.moveTo(0.0, 0.0);
            ctx.lineTo(1.0, 0.0);
            ctx.lineTo(1.0,1.0);
            ctx.lineTo(0.0, 1.0);
            ctx.closePath();
            ctx.stroke();
        }

        const xs = this.cluster.xs;
        const ys = this.cluster.ys;
        this.cluster.regions.forEach(region => {
            ctx.beginPath();
            var start = null;
            region.components.forEach(function(component) {
                component.forEach(function(p, i) {
                    if (i==0) {
                        ctx.moveTo(p.x, p.y);                    
                    } else {
                        ctx.lineTo(p.x, p.y);
                    } 
                });
            });
            ctx.closePath();
            ctx.stroke();
        });
        if (true) {
            ctx.setStrokeColor("green");
            this.cluster.vertices.forEach(function(v){
                ctx.beginPath();
                ctx.moveTo(v.x, v.y);
                ctx.lineTo(v.x + v.force.x, v.y+v.force.y);
                ctx.stroke();
            });
        }
        ctx.setStrokeColor("red");
        this.cluster.vertices.forEach(function(v){
            ctx.beginPath();
            ctx.circle(v.x, v.y, 2/ctx.scale);
            ctx.stroke();
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
                .append($elem("td").text(region.compute_area()))
                .append($elem("td").append($input))
                .append($elem("td").text(region.pressure)));
        });
        this.$div.append($table);
    }

    update_html() {

    }

    draw() {
        this.plot();
        this.populate_html();
    }

    update() {
        this.cluster.evolve(0.1);
        this.draw();
        if (this.loop) window.requestAnimationFrame(this.update());
    }

    mousemove(evt) {
        const xy = this.myctx.getCursorPosition(evt);
        const x = xy[0];
        const y = xy[1];
        this.cursor_x = x;
        this.cursor_y = y;
        
    }

}

let main = null;

$(() => {
    console.log("jsbubble");
    main = new Main();
    main.loop = false;
    main.draw();
});