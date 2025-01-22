/**
 * Copyright 2021, 2022 Emanuele Paolini (emanuele.paolini@unipi.it)
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 **/

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
            auto_topology: false,
            fill_regions: false,
            region_colors: [
                "#a008", "#0808", "#8808", "#cdc8", "#0088", "#8088", 
                "#ffe8", "#0888", "#ccc8", "#acf8", "#aaa8", "#8888", 
                "#f008", "#0f08", "#ff08", "#00f8", "#f0f8", "#0ff8"],
            initial_message: "",
            show_buttons: true,
            show_measures: true,
            show_options: true,
            record_commands: true,
            dt: 0.2,
            ds: 0.1,
            plot_offset: new Vec(0,0),
            ...options
        }

        this.selected_tool = "draw"

        this.cluster = null

        this.loop = true
        this.region_ids = null
        this.new_chain = null
        this.new_vertices = null
        this.records = []
        this.recorded_options = {}
        this.record_update_count = 0
        this.translate = new Vec(0,0)

        this.myctx = null        
        
        if (this.options.canvas) {
            this.set_canvas(this.options.canvas)
        }

        this.command_reset()
        this.update()
    }

    set_canvas(canvas) {
        // if (canvas.style) canvas.style.touchAction = "none"
        this.myctx = new MyCtx(0, 0, 10)
        this.myctx.reset_canvas(canvas)

        let event_down=(p) => {
            let chain = find_closest_chain(this.cluster.chains, p)
            switch(this.selected_tool) {
                case "remove":
                    const region = this.cluster.region_containing(p)
                    if (chain) this.command_remove(chain, region)
                    break
                case "flip":
                    if (chain) this.command_flip(chain)
                    break
                case "collapse":
                    if (chain) this.command_collapse(chain)
                    break
                case "split":
                    const v = find_closest_node(this.cluster.nodes, p)
                    if (v && v.signed_chains.length > 3) {
                        this.command_split(v)
                        this.cluster.split_vertex(v)
                    }
                    break
            }
            if (!this.loop) this.draw()
        }

        let event_move=(p)=> {
            if (this.selected_tool === "draw") {
                this.command_draw(p)
                if (!this.loop) this.draw()
            }
        }

        let event_up=()=> {
            if (this.selected_tool === "draw") {
                this.command_draw(null)
                if (!this.loop) this.draw()
            }            
        }

        // mouse controls: 

        let on_mouse_down=(evt)=> {
            const p = new Vec(...this.myctx.getCursorPosition(evt))
            event_down(p)
        }

        let on_mouse_move=(evt)=> {
            if (evt.buttons !== 1) return 
            const p = new Vertex(...this.myctx.getCursorPosition(evt))
            event_move(p)
        }

        let on_mouse_up=(evt)=> {
            event_up(evt)
        }

        canvas.addEventListener("pointerdown", on_mouse_down, false)
        canvas.addEventListener("pointermove", on_mouse_move, false)
        window.addEventListener("pointerup", on_mouse_up, false)

        // touch controls

        let on_touch_down=(evt)=> {
            const p = new Vec(...this.myctx.getTouchPosition(evt))
            event_down(p)
            evt.preventDefault()
        }

        let on_touch_move=(evt)=> {
            const p = new Vec(...this.myctx.getTouchPosition(evt))
            event_move(p)
            evt.preventDefault()
        }

        let on_touch_up=(evt)=> {
            event_up()
            evt.preventDefault()
        }

        let on_key_down=(evt)=> {
            if (document.activeElement.tagName === 'INPUT') return;

            switch(evt.key) {
                case "ArrowDown":
                    this.options.plot_offset.y -= 0.1
                    break;
                case "ArrowUp":
                    this.options.plot_offset.y += 0.1
                    break;
                case "ArrowLeft":
                    this.options.plot_offset.x -= 0.1
                    break;
                case "ArrowRight":
                    this.options.plot_offset.x += 0.1
                    break;
                default:
                    console.log("key down", evt.key, "not handled")
            }
        }

        canvas.addEventListener("touchstart", on_touch_down, false)
        canvas.addEventListener("touchmove", on_touch_move, false)
        canvas.addEventListener("touchup", on_touch_up, false)
        window.addEventListener("keydown", on_key_down, false)
    }
    
    plot(ctx) {
        ctx.background(this.options.bg_color)

        if (this.cluster.chains.length === 0) {
            ctx.setFillColor(this.options.stroke_color)
            ctx.ctx.textAlign = "center"
            ctx.ctx.font = "20px Arial"
            ctx.fillText(this.options.initial_message,0,0)
        }

        if (this.options.fill_regions) {
            this.cluster.regions.forEach((region, i) => {
                ctx.setFillColor(region.color)
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
                ctx.lineTo(v.x + v.force.x, v.y+v.force.y);
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

    populate_html($div) {
        const self = this
        $div.empty();

        let tools = {
            "draw": (this.cluster.regions.length === 0 
                ? "Draw a closed curve" 
                : "Draw a line joining two boundary points"),
            "remove": "Remove an edge",
            "flip": "Flip an edge",
            "collapse": "Collapse an edge",
            "split": "Split a vertex with at least 4 edges"
        }
        let $select = $elem("select")
        $div.append($select)
        Object.entries(tools).forEach( ([key,val]) => {
            $select.append($elem("option").attr("value", key).text(val))
        })
        $select.val(this.selected_tool)
        $select.change(function() {self.selected_tool = $(this).val()})

        $div.append($elem("br"))

        $div.append($elem("span").text("precision"))
        $div.append($elem("input").attr({
            id: "precision",
            type: "range",
            min: "1",
            max: "4",
            step: "any",
            value: -Math.log(this.options.ds)/Math.log(2) 
        }).change(evt => {
            this.options.ds = Math.pow(2, -parseFloat(evt.target.value))
        }))
        $div.append($elem("span").text(" speed"))
        $div.append($elem("input").attr({
            id: "speed",
            type: "range",
            min: "-4",
            max: "1",
            step: "any",
            value: Math.log(this.options.dt)/Math.log(2)
        }).change(evt => {
            this.options.dt = Math.pow(2, parseFloat(evt.target.value))
        }))
        $div.append($elem("span").attr("id","span_ds_dt"))

        $div.append($elem("br"))

        if (this.options.show_buttons) {
            let $button = $elem("button");
            const set_button_text = () => {
                $button.text(this.loop?"pause":"continue")
            }
            set_button_text()
            $button.click(() => {
                this.loop = !this.loop
                set_button_text()
                if (this.loop) this.update()
            })
            $div.append($button)

            $div.append($elem("button").text("step").click(() => {
                this.loop = 0 
                set_button_text()
                this.update()
            }))

            $div.append($elem("button").text("reset").click(() => {
                this.command_reset()
                if (!this.loop) this.draw()
            }))
        }
        if (this.options.show_options) {
            const add_checkbox=(option_name, option_description)=>{
                $div.append($elem("input")
                    .attr("type", "checkbox")
                    .prop("checked", this.options[option_name])
                    .change(function() { 
                        self.options[option_name] = $(this).prop("checked")
                        self.region_ids = null // force recompute
                        if (!this.loop) self.draw()
                    })).append($elem("span").text(option_description))
            }

            add_checkbox("fill_regions","fill regions")
            add_checkbox("draw_forces", "draw forces")
            add_checkbox("auto_topology", "auto topology")
        }
        if (this.options.show_measures && this.cluster.regions.length > 0) {
            $div.append($elem("p").attr("id", "perimeter"));
            var $table = $elem("table");
            $table.append($elem("tr")
                .append($elem("th").attr('style', 'width: 2em').text("region"))
                .append($elem("th").attr('style', 'width: 5em').text("target"))
                .append($elem("th").attr('style', 'width: 5em').text("area"))
                .append($elem("th").attr('style', 'width: 5em').text("pressure"))
                .append($elem("th").attr('style', 'width: 5em').text("perimeter")));
            this.cluster.regions.forEach(region => {
                let $input = $elem("input")
                    .attr("id", "target_" + region.id)
                    .attr("value", region.target_area)
                    .attr("size", 5).change((event) => {
                    let target = parseFloat(event.target.value)
                    region.set_target(target) 
                });
                const paint=(el, color)=>{
                    if (this.options.fill_regions) return el.css("background-color",color)
                    else return el
                }
                $table.append($elem("tr")
                    .append(paint($elem("td").text(region.id),region.color))
                    .append($elem("td").append($input))
                    .append($elem("td").attr("id", "area_" + region.id))
                    .append($elem("td").attr("id", "pressure_" + region.id))
                    .append($elem("td").attr("id", "perimeter_" + region.id)));
            });
            $div.append($table);
        }
        this.update_html();
    }

    update_html() {
        $("#perimeter").text("perimeter: " + this.cluster.perimeter().toFixed(4));
        $("#span_ds_dt").text(` [ds=${this.options.ds.toFixed(3)}, dt=${this.options.dt.toFixed(3)}]`)
        this.cluster.regions.forEach(region => {
            $("#area_" + region.id).text(region.area().toFixed(4));
            $("#target_" + region.id).attr("value", region.area_target.toFixed(4));
            $("#pressure_" + region.id).text(region.pressure.toFixed(4));
            $("#perimeter_" + region.id).text(region.perimeter().toFixed(4));
        });
    }

    draw() {
        let regions_changed = (this.region_ids === null)  
            || (this.cluster.regions.length != this.region_ids.length)
        this.cluster.regions.forEach((region, i) => {
            const colors = this.options.region_colors
            if (!this.region_ids || region.id !== this.region_ids[i]) regions_changed = true
            if (region.color === null) region.color = colors[(region.id-1) % colors.length]
        })
        this.region_ids = this.cluster.regions.map(region => region.id)

        if (regions_changed) {
            // repopulate html if the number of regions has changed
            if (this.options.div) this.populate_html($(this.options.div))
            this.n_regions = this.cluster.regions.length
        }
        if (this.myctx) this.plot(this.myctx)
        if (this.options.div) this.update_html();
    }

    update() {
        this.cluster.fix_topology = !this.options.auto_topology
        this.cluster.dt = this.options.dt
        this.cluster.ds = this.options.ds
        this.cluster.evolve()
        this.cluster.each_vertex(vertex => vertex.add(this.options.plot_offset));
        if (this.cluster.regions.length === 0) this.selected_tool = "draw"
        this.draw()
        if (this.loop) {
            window.requestAnimationFrame(() => this.update())
        }
    }
        
    node(id) {
        return some(this.cluster.nodes,
            node => (node.id === id ? node : null))
    }

    chain(id) {
        return some(this.cluster.chains, 
            chain => (chain.id === id ? chain : null))
    }

    region(id) {
        return some(this.cluster.regions,
            region => (region.id === id ? region : null))
    }

    record(msg) {
        if (!this.options.record_commands) return
        ["ds", "dt"].forEach(key => {
            const val = this.options[key]
            const v = this.recorded_options[key]
            if (v!==val) {
                if (key === "ds" || key === "dt") this.records.push(`main.cluster.${key}=${JSON.stringify(val)}`)
                this.recorded_options[key] = val
            }
        })
        this.records.push(msg)
    }

    command_reset() {
        this.record(`main.command_reset()`)
        this.cluster = new Cluster(this.options.ds, this.options.dt)
    }

    command_step(count) {
        count = count || 1
        this.record(`main.command_step(${count})`)
        for(;count>0;count--) this.update()
    }

    command_draw(p) {
        if (p !== null) {
            if (this.new_vertices === null) {
                this.new_vertices = [];
            }
            if (this.new_vertices.length == 0 
                || vec_distance(last(this.new_vertices), p) > this.options.ds) {
                this.new_vertices.push(p)
            }
        } else {
            if (this.new_vertices && this.new_vertices.length >= 2) {
                this.new_vertices.forEach(p => {
                    this.record(`main.command_draw(new Vertex(${p.x},${p.y}))`)
                })
                this.record(`main.command_draw(null)`)
                let chain = new Chain(this.new_vertices)
                this.cluster.add_chain(chain)
                this.cluster.graft_chain(chain);
            }
            this.new_vertices = null;
        }
    }

    command_flip(chain) {
        this.record(`main.command_flip(main.chain(${chain.id}))`)
        if (chain === null) return
        this.cluster.flip_chain(chain)
    }

    command_split(vertex) {
        this.record(`main.command_split(main.node(${vertex.id}))`)
        this.cluster.split_vertex(vertex)
    }

    command_collapse(chain) {
        this.record(`main.command_collapse(main.chain(${chain.id}))`)
        if (chain === null) return
        this.cluster.collapse_chain(chain)
    }

    command_remove(chain, region) {
        if (chain === null) return
        this.record(`main.command_remove(main.chain(${chain.id}),main.region(${region?region.id:-1}))`)
        if (region === null && chain && chain.signed_regions.length > 0) {
            region = chain.signed_regions[0][1]
        } else {

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
                other_region.set_target(other_region.area_target + region.area_target)
            }
            this.cluster.remove_region(region)
        }
        if (chain) this.cluster.remove_chain(chain)
        this.cluster.simplify_chains()
        this.cluster.simplify_vertices()
    }

    command_check(other) {
        const my = this.cluster.json()
        const check = compare_json(my, other)
        return check
    }
}

console.log(`jsbubble ver ${VERSION} manu-fatto 2022`)
