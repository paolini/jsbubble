function $elem(s) {return $(`<${s}></${s}>`);}

class Main {
    constructor(options) {
        this.options = {
            canvas: null,
            div: null,
            draw_nodes: true,
            draw_vertices: false,
            draw_forces: false,
            draw_unit_square: false,
            bg_color: "#eee",
            stroke_color: "blue",
            pen_color: "gray",
            force_color: "green",
            vertex_color: "black",
            node_color: "red",
            draw_ids: false,
            vertex_id_color: "black",
            chain_id_color: "blue",
            fix_topology: true,
            fill_regions: false,
            region_colors: [
                "#a008", "#0808", "#8808", "#0088", "#8088", "#0888",
                "#ccc8", "#cdc8", "#acf8", "#ffe8", "#aaa8", "#8888", 
                "#f008", "#0f08", "#ff08", "#00f8", "#f0f8", "#0ff8"],
            initial_message: "",
            show_buttons: true,
            show_measures: true,
            show_options: true,
            ...options
        }

        this.selected_tool = "draw"

        const canvas = this.options.canvas || $("#canvas")[0];
        canvas.style.touchAction = "none";
        this.$div = this.options.div || $("#div");

        this.myctx = new MyCtx(0, 0, 10);
        this.myctx.reset_canvas(canvas);
//        this.cluster = new_bouquet(2);
        this.cluster = new Cluster();

        this.loop = true;
        this.n_regions = -1;
        this.dt = 0.2;
        this.new_chain = null
        this.new_vertices = null;

        function on_mouse_down(evt) {
            if (this.selected_tool === "pop") {
                const p = new Vec(...this.myctx.getCursorPosition(evt))
                let region = this.cluster.region_containing(p)
                let { chain } = find_closest_chain(this.cluster.chains, p)
                if (region === null && chain && chain.signed_regions.length > 0) {
                    region = chain.signed_regions[0][1]
                }
                if (region) {
                    let other_region = null
                    if (chain && chain.signed_regions.length > 1) {
                        other_region = chain.signed_regions[0][1]
                        if (other_region === region) {
                            other_region = chain.signed_regions[1][1]
                        }
                    }
                    if (other_region !== null) {
                        region.signed_chains.forEach(([sign, chain])=> {
                            other_region.signed_chains.push([sign,chain])
                            chain.signed_regions.push([sign, other_region])
                        })
                        other_region.area_target += region.area_target
                    }
                    this.cluster.remove_region(region)
                }
                if (chain) this.cluster.remove_chain(chain)
                this.cluster.simplify_chains()
                this.cluster.simplify_vertices()
            } else if (this.selected_tool === "flip") {
                const p = new Vec(...this.myctx.getCursorPosition(evt))
                let { chain } = find_closest_chain(this.cluster.chains, p)
                this.cluster.flip_chain(chain)
            }
        }

        function on_mouse_move(evt) {
            if (this.selected_tool === "draw") {
                if (evt.buttons == 1) {
                    const p = new Vertex(...this.myctx.getCursorPosition(evt))
                    if (this.new_vertices === null) {
                        this.new_vertices = [];
                    }
                    if (this.new_vertices.length == 0 || vec_distance(last(this.new_vertices), p) > this.cluster.ds) {
                        this.new_vertices.push(p)
                    }
                }
            }
        }

        function on_mouse_up(evt) {
            if (this.selected_tool === "draw") {
                if (this.new_vertices && this.new_vertices.length >= 2) {
                    let chain = new Chain(this.new_vertices)
                    this.cluster.add_chain(chain)
                    this.cluster.graft_chain(chain);
                }
                this.new_vertices = null;
            }
        }

        canvas.addEventListener("pointerdown", on_mouse_down.bind(this), false)
        canvas.addEventListener("pointermove", on_mouse_move.bind(this), false)
        canvas.addEventListener("pointerup", on_mouse_up.bind(this), false)

        this.update();
    }
        
    plot() {
        const ctx = this.myctx
        ctx.background(this.options.bg_color)

        if (this.cluster.chains.length === 0) {
            ctx.setFillColor(this.options.stroke_color)
            ctx.ctx.textAlign = "center"
            ctx.ctx.font = "20px Arial"
            ctx.fillText(this.options.initial_message,0,0)
        }

        if (this.options.fill_regions) {
            const colors = this.options.region_colors
            this.cluster.regions.forEach((region, i) => {
                ctx.setFillColor(colors[i % colors.length])
                let signed_chains = region.signed_chains.filter(() => true) // clone
                while (signed_chains.length > 0) {
                    let [sign, chain] = signed_chains.pop()
                    let signed_path = locate_path(signed_chains, chain.node(sign), chain.node(-sign), 1, true)
                    if (signed_path === null) {
                        console.log("ERROR: PATH NOT FOUND!")
                        break
                    }
                    signed_path.push([sign, chain])

                    ctx.beginPath()
                    let first = true
                    signed_path.forEach(([sign, chain])=> {
                        function draw(v) {
                            if (first) {
                                ctx.moveTo(v.x, v.y)
                                first = false
                            } else {
                                ctx.lineTo(v.x, v.y)
                            }
                        }
                        if (sign>0) {
                            for (let i=0; i<chain.vertices.length-1; ++i) {
                                draw(chain.vertices[i])
                            }
                        } else {
                            for (let i=chain.vertices.length-1;i>0;i--){
                                draw(chain.vertices[i])
                            }
                        }
                    })
                    ctx.closePath()
                    ctx.fill()
                }
            })
        }

        if (this.options.draw_unit_square) {
            ctx.setStrokeColor("blue");
            ctx.beginPath();
            ctx.moveTo(0.0, 0.0);
            ctx.lineTo(1.0, 0.0);
            ctx.lineTo(1.0,1.0);
            ctx.lineTo(0.0, 1.0);
            ctx.closePath();
            ctx.stroke();
        }

        function draw_curve(points) {
            if (points.length<1) return
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (var i=1; i<points.length; ++i) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
        }

        ctx.setStrokeColor(this.options.stroke_color);
        this.cluster.chains.forEach(chain => draw_curve(chain.vertices));

        if (this.options.draw_forces) {
            ctx.setStrokeColor(this.options.force_color);
            this.cluster.each_vertex(function(v){
                ctx.beginPath();
                ctx.moveTo(v.x, v.y);
                ctx.lineTo(v.x + v.force.x*100, v.y+v.force.y*100);
                ctx.stroke();
            });
        }

        if (this.options.draw_vertices) {
            ctx.setStrokeColor(this.options.vertex_color);
            this.cluster.each_vertex(function(v){
                ctx.beginPath();
                ctx.circle(v.x, v.y, 1/ctx.scale);
                ctx.stroke();
            });
        } 
        
        if (this.options.draw_nodes) {
            ctx.setStrokeColor(this.options.node_color);
            this.cluster.nodes.forEach(function(v){
                ctx.beginPath();
                ctx.circle(v.x, v.y, 2/ctx.scale);
                ctx.stroke();
            });
        }

        if (this.options.draw_ids) {
            this.cluster.info()
            ctx.setFillColor(this.options.vertex_id_color)
            this.cluster.nodes.forEach(v => ctx.fillText(`${v.id}`, v.x, v.y))
            ctx.setFillColor(this.options.chain_id_color)
            this.cluster.chains.forEach(chain => {
                const v = chain.vertices[Math.floor(chain.vertices.length/3)]
                ctx.fillText(`${chain.id}`, v.x, v.y)
            })
        }
        
        if (this.new_vertices !== null) {
            ctx.setStrokeColor(this.options.pen_color);
            draw_curve(this.new_vertices);
        }
    }

    populate_html() {
        const self = this
        this.$div.empty();

        let tools = {
            "draw": (this.cluster.regions.length === 0 
                ? "Draw a closed curve" 
                : "Draw a line joining two boundary points"),
            "pop": "Pop a bubble",
            "flip": "Flip an edge"
        }
        let $select = $elem("select")
        this.$div.append($select)
        Object.entries(tools).forEach( ([key,val]) => {
            $select.append($elem("option").attr("value", key).text(val))
        })
        $select.val(this.selected_tool)
        $select.change(function() {self.selected_tool = $(this).val()})
        this.$div.append($elem("br"))

        // if (this.custom) this.$div.hide();
        if (this.options.show_buttons) {
            let $button = $elem("button");
            const set_button_text = () => {
                $button.text(this.loop?"pause":"continue");
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
            this.$div.append($elem("button").text("reset").click(() => {
                this.cluster = new Cluster();
            }));
        }
        if (this.options.show_options) {
            const add_checkbox=(option_name, option_description)=>{
                this.$div.append($elem("input")
                    .attr("type", "checkbox")
                    .prop("checked", this.options[option_name])
                    .change(function() { 
                        self.options[option_name] = $(this).prop("checked")
                        self.n_regions = null // force redraw
                    })).append($elem("span").text(option_description))
            }

            add_checkbox("fill_regions","fill regions")
            add_checkbox("draw_forces", "draw forces")
        }
        if (this.options.show_measures && this.cluster.regions.length > 0) {
            this.$div.append($elem("p").attr("id", "perimeter"));
            var $table = $elem("table");
            $table.append($elem("tr")
                .append($elem("th").attr('style', 'width: 2em').text("region"))
                .append($elem("th").attr('style', 'width: 5em').text("area"))
                .append($elem("th").attr('style', 'width: 5em').text("target"))
                .append($elem("th").attr('style', 'width: 5em').text(""))
                .append($elem("th").attr('style', 'width: 5em').text("perimeter")));
            this.cluster.regions.forEach((region,i) => {
                const colors = this.options.region_colors
                let $input = $elem("input")
                    .attr("id", "target_" + i)
                    .attr("value", region.target_area)
                    .attr("size", 5).change((event) => {
                    let target = parseFloat(event.target.value);
                    region.area_target = target; 
                });
                const paint=(el, i)=>{
                    if (this.options.fill_regions) return el.css("background-color",colors[i % colors.length])
                    else return el
                }
                $table.append($elem("tr")
                    .append(paint($elem("td").text(i),i))
                    .append($elem("td").attr("id", "area_" + i))
                    .append($elem("td").append($input))
                    .append($elem("td").attr("id", "pressure_" + i))
                    .append($elem("td").attr("id", "perimeter_" + i)));
            });
            this.$div.append($table);
        }
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
        this.cluster.fix_topology = this.options.fix_topology
        this.cluster.evolve(this.dt);
        this.draw();
        if (this.loop) window.requestAnimationFrame(() => this.update());
    }

}

