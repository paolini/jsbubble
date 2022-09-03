/**
 * Copyright 2021, 2022 Emanuele Paolini (emanuele.paolini@unipi.it)
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 **/

 class MyCtx {
    constructor(x, y, diagonal) {
        this.x_center = x;
        this.y_center = y;
        this.diagonal = diagonal;
        this.update(640, 480);
        this.ctx = null;
        this.canvas = null;
    }

    getCursorPosition(event) {
        if (this.canvas == null) return null;
        const rect = this.canvas.getBoundingClientRect();
        if (event.touches) event = event.touches[0]; // mobile devices
        const x = this.x_ctx(event.clientX - rect.left);
        const y = this.y_ctx(event.clientY - rect.top);
        return [x, y];
    }

    update(width, height) {
        var d = Math.sqrt(width*width + height*height);
        this.scale = d / this.diagonal;
        this.x0 = this.x_center - 0.5 * width / this.scale;
        this.y0 = this.y_center + 0.5 * height / this.scale;
        
        assert_close(this.ctx_x(this.x_center), 0.5*width);
        assert_close(this.ctx_y(this.y_center), 0.5*height);
    }

    reset_canvas(canvas) {
        this.update(canvas.width, canvas.height);
        this.ctx = canvas.getContext("2d");
        this.canvas = canvas;
    }

    background(color) {
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    ctx_x(x) {
        return (x - this.x0) * this.scale;
    }

    ctx_y(y) {
        return (this.y0 - y) * this.scale;
    }

    x_ctx(xx) {
        return this.x0 + xx/this.scale;
    }

    y_ctx(yy) {
        return this.y0 - yy/this.scale;
    }

    beginPath() {
        return this.ctx.beginPath();
    }

    closePath() {
        return this.ctx.closePath();
    }

    stroke() {
        return this.ctx.stroke();
    }

    fill() {
        return this.ctx.fill()
    }

    moveTo(x,y) {
        return this.ctx.moveTo(this.ctx_x(x), this.ctx_y(y));
    }

    lineTo(x,y) {
        return this.ctx.lineTo(this.ctx_x(x), this.ctx_y(y));
    }

    arc(x,y,r,a,b) {
        return this.ctx.arc(this.ctx_x(x),this.ctx_y(y),r*this.scale,-b,-a);
    }

    circle(x,y,r) {
        return this.arc(x,y,r,0,2*Math.PI);
    }

    line(x0, y0, x1, y1) {
        this.beginPath();
        this.moveTo(x0, y0);
        this.lineTo(x1, y1);
        this.stroke();
    }

    setStrokeColor(color) {
        this.ctx.strokeStyle = color
    }

    setFillColor(color) {
        this.ctx.fillStyle = color
    }

    fillText(text, x, y) {
        this.ctx.fillText(text, this.ctx_x(x), this.ctx_y(y))
    }
}
