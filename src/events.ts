import { Point } from "shared";
import { RenderContext } from "render";
import { addUndoQueue, pageState, redo, undo, viewportState } from "state";
import { UIElements } from "ui";

let moveTimeout: number;

window.addEventListener("resize", () => {
    RenderContext.resize();
    UIElements.fixGrid();
    requestAnimationFrame(RenderContext.draw);
});

// Handle Undo/Redo keyboard input
document.addEventListener("keydown", e => {
    if (e.ctrlKey) {
        if (e.key === 'z') {
            e.shiftKey ? redo() : undo();
        } else if (e.key === 'y') {
            redo();
        }
    } 
});

// Handle panning and zooming the viewport
document.addEventListener("mousemove", e => {
    if (e.buttons === 1 && viewportState.pointer.dragging) {
        let canvasCoords = UIElements.canvas.getBoundingClientRect();
        let clickPos = new Point(e.clientX - canvasCoords.left, e.clientY - canvasCoords.top);
        let touchOffset = new Point(clickPos.x - viewportState.pointer.lastPos.x, clickPos.y - viewportState.pointer.lastPos.y);
        moveDrag(touchOffset);
        viewportState.pointer.lastPos = clickPos;
        requestAnimationFrame(RenderContext.draw);
    }
});
UIElements.canvas.addEventListener("mousedown", e => {
    document.body.style.userSelect = "none";
    let canvasCoords = UIElements.canvas.getBoundingClientRect();
    let clickPos = new Point(e.clientX - canvasCoords.left, e.clientY - canvasCoords.top);
    viewportState.pointer.lastPos = clickPos;
    viewportState.pointer.dragging = true;
});
document.addEventListener("mouseup", () => {
    if (viewportState.pointer.dragging) {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(addUndoQueue, 1000);
    }

    document.body.style.userSelect = "";
    viewportState.pointer.dragging = false;
});

UIElements.canvas.addEventListener("wheel", e => {
    e.preventDefault();
    zoomScreen(new Point(e.offsetX,e.offsetY),-0.002*e.deltaY*(e.ctrlKey ? 4 : 1)*(e.shiftKey ? 0.25 : 1));
    requestAnimationFrame(RenderContext.draw);
    
    clearTimeout(moveTimeout);
    moveTimeout = setTimeout(addUndoQueue, 1000);
});

// Handle panning and zooming the viewport on touchscreen devices
document.addEventListener("touchmove", e => {
    if (viewportState.pointer.dragging) {
        e.preventDefault();
        let touches = getTouches(e);
        let touchOffset = new Point(touches.center[0] - viewportState.pointer.lastPos.x, touches.center[1] - viewportState.pointer.lastPos.y);
        if (pageState.fad) {
            moveDrag(touchOffset, pageState.offset.angle);
        } else {
            moveDrag(touchOffset);
        }
        let zoomFactor;
        if (viewportState.pointer.dist > 0) {
            zoomFactor = touches.dist / viewportState.pointer.dist;
        } else {
            zoomFactor = 1;
        }
        let centerPoint = Point.fromArray(touches.center);
        scaleScreen(centerPoint, zoomFactor);

        let angleDif = touches.angle - viewportState.pointer.lastAngle;
        if (pageState.fad) {
            pageState.offset.angle += Math.atan2(Math.sin(angleDif),Math.cos(angleDif));
        }
        viewportState.pointer.lastPos = centerPoint;
        viewportState.pointer.lastAngle = touches.angle;
        viewportState.pointer.dist = touches.dist;
        requestAnimationFrame(RenderContext.draw);
    }
});
UIElements.canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    document.body.style.userSelect = "none";
    let touches = getTouches(e);
    viewportState.pointer.lastPos = Point.fromArray(touches.center);
    viewportState.pointer.lastAngle = touches.angle;
    viewportState.pointer.dist = touches.dist;
    viewportState.pointer.dragging = true;
});
document.addEventListener("touchend", () => {
    if (viewportState.pointer.dragging) {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(addUndoQueue, 1000);
    }
    
    document.body.style.userSelect = "";
    viewportState.pointer.dragging = false;
});

function moveDrag(coords: Point, angle?: number) {
    let movePos = RenderContext.pxToMath(coords);
    if (angle !== undefined) {
        movePos = new Point(movePos.x * Math.cos(-angle) - movePos.y * Math.sin(-angle), movePos.x * Math.sin(-angle) + movePos.y * Math.cos(-angle));
    }
    pageState.offset.pos.x = pageState.offset.pos.x - movePos.x/pageState.zoom.log;
    pageState.offset.pos.y = pageState.offset.pos.y + movePos.y/pageState.zoom.log;
}

// Exponentially zooms the screen
function zoomScreen(coords: Point, zoomAmt: number) {
    let zoomPoint = RenderContext.pxToCanvas(coords);
    pageState.offset.pos.x = pageState.offset.pos.x + zoomPoint.x/pageState.zoom.log;
    pageState.offset.pos.y = pageState.offset.pos.y - zoomPoint.y/pageState.zoom.log;
    pageState.zoom.level += zoomAmt;
    pageState.zoom.log = Math.pow(2,pageState.zoom.level);
    pageState.offset.pos.x = pageState.offset.pos.x - zoomPoint.x/pageState.zoom.log;
    pageState.offset.pos.y = pageState.offset.pos.y + zoomPoint.y/pageState.zoom.log;
}

// Linearly zooms the screen
function scaleScreen(coords: Point, zoomAmt: number) {
    let zoomPoint = RenderContext.pxToCanvas(coords);
    pageState.offset.pos.x = pageState.offset.pos.x + zoomPoint.x/pageState.zoom.log;
    pageState.offset.pos.y = pageState.offset.pos.y - zoomPoint.y/pageState.zoom.log;
    pageState.zoom.log *= zoomAmt;
    pageState.zoom.level = Math.log2(pageState.zoom.log);
    pageState.offset.pos.x = pageState.offset.pos.x - zoomPoint.x/pageState.zoom.log;
    pageState.offset.pos.y = pageState.offset.pos.y + zoomPoint.y/pageState.zoom.log;
}

// Given a touch event, returns the midpoint, distance of first touch from the midpoint, and angle of the two touches
function getTouches(e: TouchEvent) {
    let canvasCoords = UIElements.canvas.getBoundingClientRect();
    if (e.touches.length === 1) {
        return {center: [(e.targetTouches[0].pageX - canvasCoords.left), (e.targetTouches[0].pageY - canvasCoords.top)], dist: 0, angle: viewportState.pointer.lastAngle};
    } else {
        let total = [0, 0];
        for (let i = 0; i < e.touches.length; i++) {
            total = [total[0] + (e.targetTouches[i].pageX - canvasCoords.left), total[1] + (e.targetTouches[i].pageY - canvasCoords.top)];
        }
        let centerPoint = [total[0]/e.touches.length,total[1]/e.touches.length];
        let centerDistance = Math.sqrt(Math.pow(centerPoint[0] - (e.targetTouches[0].pageX - canvasCoords.left), 2) + Math.pow(centerPoint[1] - (e.targetTouches[0].pageY - canvasCoords.top), 2));
        let angle;
        if (pageState.fad) {
            angle = Math.atan2((e.targetTouches[1].pageY - canvasCoords.top)-(e.targetTouches[0].pageY - canvasCoords.top), (e.targetTouches[1].pageX - canvasCoords.top)-(e.targetTouches[0].pageX - canvasCoords.left))%(2*Math.PI);
        } else {
            angle = pageState.offset.angle;
        }
        return {center: centerPoint, dist: centerDistance, angle: angle};
    }
}