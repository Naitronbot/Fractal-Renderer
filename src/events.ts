import { Point } from "shared";
import { RenderContext } from "render";
import { pageState } from "state";
import { UIElements } from "ui";

window.addEventListener("resize", () => {
    RenderContext.current.resize();
    UIElements.fixGrid();
    requestAnimationFrame(RenderContext.draw);
});

// Handle panning and zooming the viewport
document.addEventListener("mousemove", e => {
    if (e.buttons === 1 && pageState.viewport.pointer.dragging) {
        let canvasCoords = UIElements.canvas.getBoundingClientRect();
        let clickPos = new Point(e.clientX - canvasCoords.left, e.clientY - canvasCoords.top);
        let touchOffset = new Point(clickPos.x - pageState.viewport.pointer.lastPos.x, clickPos.y - pageState.viewport.pointer.lastPos.y);
        moveDrag(touchOffset);
        pageState.viewport.pointer.lastPos = clickPos;
        requestAnimationFrame(RenderContext.draw);
    }
});
UIElements.canvas.addEventListener("mousedown", e => {
    document.body.style.userSelect = "none";
    let canvasCoords = UIElements.canvas.getBoundingClientRect();
    let clickPos = new Point(e.clientX - canvasCoords.left, e.clientY - canvasCoords.top);
    pageState.viewport.pointer.lastPos = clickPos;
    pageState.viewport.pointer.dragging = true;
});
document.addEventListener("mouseup", () => {
    document.body.style.userSelect = "";
    pageState.viewport.pointer.dragging = false;
});
UIElements.canvas.addEventListener("wheel", e => {
    zoomScreen(new Point(e.offsetX,e.offsetY),-0.002*e.deltaY);
    requestAnimationFrame(RenderContext.draw);
});

// Handle panning and zooming the viewport on touchscreen devices
document.addEventListener("touchmove", e => {
    if (pageState.viewport.pointer.dragging) {
        e.preventDefault();
        let touches = getTouches(e);
        let touchOffset = new Point(touches.center[0] - pageState.viewport.pointer.lastPos.x, touches.center[1] - pageState.viewport.pointer.lastPos.y);
        if (pageState.settings.fad) {
            moveDrag(touchOffset, pageState.settings.offset.angle);
        } else {
            moveDrag(touchOffset);
        }
        let zoomFactor;
        if (pageState.viewport.pointer.dist > 0) {
            zoomFactor = touches.dist / pageState.viewport.pointer.dist;
        } else {
            zoomFactor = 1;
        }
        let centerPoint = Point.fromArray(touches.center);
        scaleScreen(centerPoint, zoomFactor);

        let angleDif = touches.angle - pageState.viewport.pointer.lastAngle;
        if (pageState.settings.fad) {
            pageState.settings.offset.angle += Math.atan2(Math.sin(angleDif),Math.cos(angleDif));
        }
        pageState.viewport.pointer.lastPos = centerPoint;
        pageState.viewport.pointer.lastAngle = touches.angle;
        pageState.viewport.pointer.dist = touches.dist;
        requestAnimationFrame(RenderContext.draw);
    }
});
UIElements.canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    document.body.style.userSelect = "none";
    let touches = getTouches(e);
    pageState.viewport.pointer.lastPos = Point.fromArray(touches.center);
    pageState.viewport.pointer.lastAngle = touches.angle;
    pageState.viewport.pointer.dist = touches.dist;
    pageState.viewport.pointer.dragging = true;
});
document.addEventListener("touchend", e => {
    document.body.style.userSelect = "";
    pageState.viewport.pointer.dragging = false;
});

function moveDrag(coords: Point, angle?: number) {
    let movePos = RenderContext.pxToMath(coords);
    if (angle !== undefined) {
        movePos = new Point(movePos.x * Math.cos(-angle) - movePos.y * Math.sin(-angle), movePos.x * Math.sin(-angle) + movePos.y * Math.cos(-angle));
    }
    pageState.settings.offset.pos.x = pageState.settings.offset.pos.x - movePos.x/pageState.settings.zoom.log;
    pageState.settings.offset.pos.y = pageState.settings.offset.pos.y + movePos.y/pageState.settings.zoom.log;
}

// Exponentially zooms the screen
function zoomScreen(coords: Point, zoomAmt: number) {
    let zoomPoint = RenderContext.pxToCanvas(coords);
    pageState.settings.offset.pos.x = pageState.settings.offset.pos.x + zoomPoint.x/pageState.settings.zoom.log;
    pageState.settings.offset.pos.y = pageState.settings.offset.pos.y - zoomPoint.y/pageState.settings.zoom.log;
    pageState.settings.zoom.level += zoomAmt;
    pageState.settings.zoom.log = Math.pow(2,pageState.settings.zoom.level);
    pageState.settings.offset.pos.x = pageState.settings.offset.pos.x - zoomPoint.x/pageState.settings.zoom.log;
    pageState.settings.offset.pos.y = pageState.settings.offset.pos.y + zoomPoint.y/pageState.settings.zoom.log;
}

// Linearly zooms the screen
function scaleScreen(coords: Point, zoomAmt: number) {
    let zoomPoint = RenderContext.pxToCanvas(coords);
    pageState.settings.offset.pos.x = pageState.settings.offset.pos.x + zoomPoint.x/pageState.settings.zoom.log;
    pageState.settings.offset.pos.y = pageState.settings.offset.pos.y - zoomPoint.y/pageState.settings.zoom.log;
    pageState.settings.zoom.log *= zoomAmt;
    pageState.settings.zoom.level = Math.log2(pageState.settings.zoom.log);
    pageState.settings.offset.pos.x = pageState.settings.offset.pos.x - zoomPoint.x/pageState.settings.zoom.log;
    pageState.settings.offset.pos.y = pageState.settings.offset.pos.y + zoomPoint.y/pageState.settings.zoom.log;
}

// Given a touch event, returns the midpoint, distance of first touch from the midpoint, and angle of the two touches
function getTouches(e: TouchEvent) {
    let canvasCoords = UIElements.canvas.getBoundingClientRect();
    if (e.touches.length === 1) {
        return {center: [(e.targetTouches[0].pageX - canvasCoords.left), (e.targetTouches[0].pageY - canvasCoords.top)], dist: 0, angle: pageState.viewport.pointer.lastAngle};
    } else {
        let total = [0, 0];
        for (let i = 0; i < e.touches.length; i++) {
            total = [total[0] + (e.targetTouches[i].pageX - canvasCoords.left), total[1] + (e.targetTouches[i].pageY - canvasCoords.top)];
        }
        let centerPoint = [total[0]/e.touches.length,total[1]/e.touches.length];
        let centerDistance = Math.sqrt(Math.pow(centerPoint[0] - (e.targetTouches[0].pageX - canvasCoords.left), 2) + Math.pow(centerPoint[1] - (e.targetTouches[0].pageY - canvasCoords.top), 2));
        let angle;
        if (pageState.settings.fad) {
            angle = Math.atan2((e.targetTouches[1].pageY - canvasCoords.top)-(e.targetTouches[0].pageY - canvasCoords.top), (e.targetTouches[1].pageX - canvasCoords.top)-(e.targetTouches[0].pageX - canvasCoords.left))%(2*Math.PI);
        } else {
            angle = pageState.settings.offset.angle;
        }
        return {center: centerPoint, dist: centerDistance, angle: angle};
    }
}