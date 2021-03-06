class MyCtx {
    constructor(x, y, diagonal) {
        this.x_center = x;
        this.y_center = y;
        this.diagonal = diagonal;
        this.update(640, 480);
        this.ctx = null;
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

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    ctx_x(x) {
        return (x - this.x0) * this.scale;
    }

    ctx_y(y) {
        return (this.y0 - y) * this.scale;
    }

    beginPath() {
        return this.ctx.beginPath();
    }

    stroke() {
        return this.ctx.stroke();
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
}
