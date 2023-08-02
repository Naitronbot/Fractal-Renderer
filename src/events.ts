window.addEventListener("resize", e => {
    fixGrid();
    requestAnimationFrame(draw);
});

// Handle panning and zooming the viewport
document.addEventListener("mousemove", e => {
    if (e.buttons === 1 && viewport.pointer.dragging) {
        let canvasCoords = canvas.getBoundingClientRect();
        let clickPos = new Point(e.clientX - canvasCoords.left, e.clientY - canvasCoords.top);
        let touchOffset = new Point(clickPos.x - viewport.pointer.lastPos.x, clickPos.y - viewport.pointer.lastPos.y);
        moveDrag(touchOffset);
        viewport.pointer.lastPos = clickPos;
        requestAnimationFrame(draw);
    }
});
canvas.addEventListener("mousedown", e => {
    document.body.style.userSelect = "none";
    let canvasCoords = canvas.getBoundingClientRect();
    let clickPos = new Point(e.clientX - canvasCoords.left, e.clientY - canvasCoords.top);
    viewport.pointer.lastPos = clickPos;
    viewport.pointer.dragging = true;
});
document.addEventListener("mouseup", () => {
    document.body.style.userSelect = "";
    viewport.pointer.dragging = false;
});
canvas.addEventListener("wheel", e => {
    e.preventDefault();
    zoomScreen(new Point(e.offsetX,e.offsetY),-0.002*e.deltaY*(e.ctrlKey ? 4 : 1));
    requestAnimationFrame(draw);
});

// Handle panning and zooming the viewport on touchscreen devices
document.addEventListener("touchmove", e => {
    if (viewport.pointer.dragging) {
        e.preventDefault();
        let touches = getTouches(e);
        let touchOffset = new Point(touches.center[0] - viewport.pointer.lastPos.x, touches.center[1] - viewport.pointer.lastPos.y);
        if (settings.fad) {
            moveDrag(touchOffset, settings.offset.angle);
        } else {
            moveDrag(touchOffset);
        }
        let zoomFactor;
        if (viewport.pointer.dist > 0) {
            zoomFactor = touches.dist / viewport.pointer.dist;
        } else {
            zoomFactor = 1;
        }
        let centerPoint = Point.fromArray(touches.center);
        scaleScreen(centerPoint, zoomFactor);

        let angleDif = touches.angle - viewport.pointer.lastAngle;
        if (settings.fad) {
            settings.offset.angle += Math.atan2(Math.sin(angleDif),Math.cos(angleDif));
        }
        viewport.pointer.lastPos = centerPoint;
        viewport.pointer.lastAngle = touches.angle;
        viewport.pointer.dist = touches.dist;
        requestAnimationFrame(draw);
    }
});
canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    document.body.style.userSelect = "none";
    let touches = getTouches(e);
    viewport.pointer.lastPos = Point.fromArray(touches.center);
    viewport.pointer.lastAngle = touches.angle;
    viewport.pointer.dist = touches.dist;
    viewport.pointer.dragging = true;
});
document.addEventListener("touchend", e => {
    document.body.style.userSelect = "";
    viewport.pointer.dragging = false;
});

function moveDrag(coords: Point, angle?: number) {
    let movePos = pxToMath(coords);
    if (angle !== undefined) {
        movePos = new Point(movePos.x * Math.cos(-angle) - movePos.y * Math.sin(-angle), movePos.x * Math.sin(-angle) + movePos.y * Math.cos(-angle));
    }
    settings.offset.pos.x = settings.offset.pos.x - movePos.x/settings.zoom.log;
    settings.offset.pos.y = settings.offset.pos.y + movePos.y/settings.zoom.log;
}

// Exponentially zooms the screen
function zoomScreen(coords: Point, zoomAmt: number) {
    let zoomPoint = pxToCanvas(coords);
    settings.offset.pos.x = settings.offset.pos.x + zoomPoint.x/settings.zoom.log;
    settings.offset.pos.y = settings.offset.pos.y - zoomPoint.y/settings.zoom.log;
    settings.zoom.level += zoomAmt;
    settings.zoom.log = Math.pow(2,settings.zoom.level);
    settings.offset.pos.x = settings.offset.pos.x - zoomPoint.x/settings.zoom.log;
    settings.offset.pos.y = settings.offset.pos.y + zoomPoint.y/settings.zoom.log;
}

// Linearly zooms the screen
function scaleScreen(coords: Point, zoomAmt: number) {
    let zoomPoint = pxToCanvas(coords);
    settings.offset.pos.x = settings.offset.pos.x + zoomPoint.x/settings.zoom.log;
    settings.offset.pos.y = settings.offset.pos.y - zoomPoint.y/settings.zoom.log;
    settings.zoom.log *= zoomAmt;
    settings.zoom.level = Math.log2(settings.zoom.log);
    settings.offset.pos.x = settings.offset.pos.x - zoomPoint.x/settings.zoom.log;
    settings.offset.pos.y = settings.offset.pos.y + zoomPoint.y/settings.zoom.log;
}

// Given a touch event, returns the midpoint, distance of first touch from the midpoint, and angle of the two touches
function getTouches(e: TouchEvent) {
    let canvasCoords = canvas.getBoundingClientRect();
    if (e.touches.length === 1) {
        return {center: [(e.targetTouches[0].pageX - canvasCoords.left), (e.targetTouches[0].pageY - canvasCoords.top)], dist: 0, angle: viewport.pointer.lastAngle};
    } else {
        let total = [0, 0];
        for (let i = 0; i < e.touches.length; i++) {
            total = [total[0] + (e.targetTouches[i].pageX - canvasCoords.left), total[1] + (e.targetTouches[i].pageY - canvasCoords.top)];
        }
        let centerPoint = [total[0]/e.touches.length,total[1]/e.touches.length];
        let centerDistance = Math.sqrt(Math.pow(centerPoint[0] - (e.targetTouches[0].pageX - canvasCoords.left), 2) + Math.pow(centerPoint[1] - (e.targetTouches[0].pageY - canvasCoords.top), 2));
        let angle;
        if (settings.fad) {
            angle = Math.atan2((e.targetTouches[1].pageY - canvasCoords.top)-(e.targetTouches[0].pageY - canvasCoords.top), (e.targetTouches[1].pageX - canvasCoords.top)-(e.targetTouches[0].pageX - canvasCoords.left))%(2*Math.PI);
        } else {
            angle = settings.offset.angle;
        }
        return {center: centerPoint, dist: centerDistance, angle: angle};
    }
}