function $elem(s) {return $(`<${s}></${s}>`);}

class Main {
    constructor() {
        const canvas = $("#canvas")[0];
        this.$div = $("#div");
        this.myctx = new MyCtx(0, 0, 10);
        this.myctx.reset_canvas(canvas);
        this.cluster = new_bouquet(3);
        var self = this;
        canvas.addEventListener("mousemove", function(evt) {
            self.mousemove(evt);
        }, false);
        this.draw_vertices = 1;
        this.draw_forces = 1;
        this.draw_unit_square = 0;
        this.loop = 0;
        this.n_regions = -1;
        this.dt = 0.1;
        this.update();
    }
        
    plot() {
        const ctx = this.myctx;
        ctx.clear();
        ctx.setStrokeColor("blue");
        if (this.draw_unit_square) {
            ctx.beginPath();
            ctx.moveTo(0.0, 0.0);
            ctx.lineTo(1.0, 0.0);
            ctx.lineTo(1.0,1.0);
            ctx.lineTo(0.0, 1.0);
            ctx.closePath();
            ctx.stroke();
        }

        this.cluster.chains.forEach(function(chain) {
            ctx.beginPath();
            ctx.moveTo(chain.vertices[0].x, chain.vertices[0].y);
            for (var i=1; i<chain.vertices.length; ++i) {
                ctx.lineTo(chain.vertices[i].x, chain.vertices[i].y);
            }
            ctx.stroke();
        });

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
            .append($elem("th").attr('style', 'width: 10em').text("area"))
            .append($elem("th").attr('style', 'width: 10em').text("target"))
            .append($elem("th").attr('style', 'width: 10em').text("pressure"))
            .append($elem("th").attr('style', 'width: 10em').text("perimeter")));
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
        $("#perimeter").text("perimeter: " + this.cluster.perimeter())
        this.cluster.regions.forEach((region, i) => {
            $("#area_" + i).text(region.area());
            $("#target_" + i).attr("value", region.area_target);
            $("#pressure_" + i).text(region.pressure);
            $("#perimeter_" + i).text(region.perimeter());
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
});