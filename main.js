function $elem(s) {return $(`<${s}></${s}>`);}

class Main {
    constructor() {
        const canvas = $("#canvas")[0];
        canvas.style.touchAction = "none";
        this.$div = $("#div");

        this.myctx = new MyCtx(0, 0, 10);
        this.myctx.reset_canvas(canvas);
        this.cluster = new_bouquet(3);
        this.draw_vertices = false;
        this.draw_forces = true;
        this.draw_unit_square = false;
        this.loop = true;
        this.n_regions = -1;
        this.dt = 0.2;

        this.draw_chain = null;

        function on_mouse_move(evt) {
            const xy = this.myctx.getCursorPosition(evt);
            if (evt.buttons == 1) {
                if (this.draw_chain == null) {
                    this.draw_chain = new Chain();
                }
                var p = new Vec(xy[0], xy[1]);
                if (this.draw_chain.vertices.length == 0 || vec_distance(this.draw_chain.vertex_end(), p) > this.cluster.ds) {
                    this.draw_chain.vertices.push(new Vertex(xy[0], xy[1]));
                }
            }
        }
        function on_mouse_up(evt) {
            if (this.draw_chain) {
                this.cluster.add_chain(this.draw_chain);
            }
            this.draw_chain = null;
        }

        canvas.addEventListener("mousemove", on_mouse_move.bind(this), false);
        canvas.addEventListener("touchmove", on_mouse_move.bind(this), false);
        canvas.addEventListener("penmove", on_mouse_move.bind(this), false);
        
        canvas.addEventListener("mouseup", on_mouse_up.bind(this), false);
        canvas.addEventListener("touchup", on_mouse_up.bind(this), false);
        canvas.addEventListener("penup", on_mouse_up.bind(this), false);

        this.update();
    }
        
    plot() {
        const ctx = this.myctx;
        ctx.clear();

        if (this.draw_unit_square) {
            ctx.setStrokeColor("blue");
            ctx.beginPath();
            ctx.moveTo(0.0, 0.0);
            ctx.lineTo(1.0, 0.0);
            ctx.lineTo(1.0,1.0);
            ctx.lineTo(0.0, 1.0);
            ctx.closePath();
            ctx.stroke();
        }

        function draw_chain(chain) {
            ctx.beginPath();
            ctx.moveTo(chain.vertices[0].x, chain.vertices[0].y);
            for (var i=1; i<chain.vertices.length; ++i) {
                ctx.lineTo(chain.vertices[i].x, chain.vertices[i].y);
            }
            ctx.stroke();
        }

        ctx.setStrokeColor("blue");
        this.cluster.chains.forEach(draw_chain);

        if (this.draw_forces) {
            ctx.setStrokeColor("green");
            this.cluster.each_vertex(function(v){
                ctx.beginPath();
                ctx.moveTo(v.x, v.y);
                ctx.lineTo(v.x + v.force.x, v.y+v.force.y);
                ctx.stroke();
            });
        }

        if (this.draw_vertices) {
            ctx.setStrokeColor("red");
            this.cluster.each_vertex(function(v){
                ctx.beginPath();
                ctx.circle(v.x, v.y, 2/ctx.scale);
                ctx.stroke();
            });
        }
        
        if (this.draw_chain != null) {
            ctx.setStrokeColor("black");
            draw_chain(this.draw_chain);
        }
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
            set_button_text();
            if (this.loop) this.update();
        });
        this.$div.append($button);
        this.$div.append($elem("button").text("step").click(() => {
            this.loop = 0; 
            set_button_text();
            this.update();
        }));
        this.$div.append($elem("p").attr("id", "perimeter"));
        var $table = $elem("table");
        $table.append($elem("tr")
            .append($elem("th").attr('style', 'width: 2em').text("region"))
            .append($elem("th").attr('style', 'width: 5em').text("area"))
            .append($elem("th").attr('style', 'width: 5em').text("target"))
            .append($elem("th").attr('style', 'width: 5em').text("pressure"))
            .append($elem("th").attr('style', 'width: 5em').text("perimeter")));
        this.cluster.regions.forEach((region,i) => {
            let $input = $elem("input")
                .attr("id", "target_" + i)
                .attr("value", region.target_area)
                .attr("size", 5).change((event) => {
                let target = parseFloat(event.target.value);
                region.area_target = target; 
            });
            $table.append($elem("tr")
                .append($elem("td").text(i))
                .append($elem("td").attr("id", "area_" + i))
                .append($elem("td").append($input))
                .append($elem("td").attr("id", "pressure_" + i))
                .append($elem("td").attr("id", "perimeter_" + i)));
        });
        this.$div.append($table);
        this.update_html();
    }

    update_html() {
        $("#perimeter").text("perimeter: " + this.cluster.perimeter().toFixed(4));
        this.cluster.regions.forEach((region, i) => {
            $("#area_" + i).text(region.area().toFixed(4));
            $("#target_" + i).attr("value", region.area_target.toFixed(4));
            $("#pressure_" + i).text(region.pressure.toFixed(4));
            $("#perimeter_" + i).text(region.perimeter().toFixed(4));
        });
    }

    draw() {
        if (this.n_regions != this.cluster.regions.length) {
            // repopulate html if the number of regions has changed
            this.populate_html();
            this.n_regions = this.cluster.regions.length;
        }
        this.plot();
        this.update_html();
    }

    update() {
        this.cluster.evolve(this.dt);
        this.draw();
        if (this.loop) window.requestAnimationFrame(() => this.update());
    }

}

let main = null;

$(() => {
    console.log("jsbubble");
    main = new Main();
});