let states = [level];

function main () {
    run();
}

function run () {
    n = states.length;
    if (n) {
        states[n-1].draw();
        states[n-1].log("welp");
        window.requestAnimationFrame(run);
    }
    else {
        // window.close();
    }
}

function down (key) {
    if (key == " ")
        states.pop();
}