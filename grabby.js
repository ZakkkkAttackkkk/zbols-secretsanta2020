let states = [levels[0]];

cnv = document.getElementById("cnv-main");
ctx = cnv.getContext("2d");

function main () {
    run();
}

function run () {
    n = states.length;
    if (n) {
        var start;
        for (start = states.length - 1; start >= 0; start--) {
            if (states[start].passUpdate == false)
                break;
        }
        for (; start < states.length; start++){
            states[start].update();
        }
        for (start = states.length - 1; start >= 0; start--) {
            if (states[start].passDraw == false)
                break;
        }
        for (; start < states.length; start++){
            states[start].draw();
        }
        window.requestAnimationFrame(run);
    }
    else {
        // window.close();
    }
}

function down (ev) {
    if (ev.key == " ")
        states.pop();
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].keydown(ev) == false)
            break;
    }
}

function up (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].keyup(ev) == false)
            break;
    }
}

function press (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].keypress(ev) == false)
            break;
    }
}