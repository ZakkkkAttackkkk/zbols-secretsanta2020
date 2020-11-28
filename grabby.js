let states = [levels[0]];

function main () {
    run();
}

function run (t) {
    n = states.length;
    if (n) {
        var start;
        for (start = n - 1; start >= 0; start--) {
            if (states[start].passUpdate == false)
                break;
        }
        for (; start < n; start++){
            states[start].update(t);
        }
        for (start = n - 1; start >= 0; start--) {
            if (states[start].passDraw == false){
                break;
            }
        }
        for (; start < n; start++){
            states[start].draw();
        }
        window.requestAnimationFrame(run);
    }
    else {
        // window.close();
    }
}

document.body.onkeydown = function keydown (ev) {
    if (ev.key == " ")
        states.pop();
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].keydown(ev) == false)
            break;
    }
}

document.body.onkeyup = function keyup (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].keyup(ev) == false)
            break;
    }
}

document.body.onkeypress = function keypress (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].keypress(ev) == false)
            break;
    }
}

cnv.onmousedown = function mousedown (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].mousedown(ev) == false)
            break;
    }
}

cnv.onmouseup = function mouseup (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].mouseup(ev) == false)
            break;
    }
}

cnv.onmousepress = function mousepress (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].mousepress(ev) == false)
            break;
    }
}