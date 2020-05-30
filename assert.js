function assert(condition, message=null) {
    if (!condition) {
        throw "assertion failed" + (message?": "+ message:"");
    }
}

function assert_close(x1, x2, error=1E-10, message=null) {
    assert(Math.abs(x1-x2) < error, message);
}
