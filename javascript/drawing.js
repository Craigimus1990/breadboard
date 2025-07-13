
const canvas = document.getElementById('breadboard');
const tempCanvas = document.getElementById('temp-line');
const gridSpacing = 30;
const ctx = canvas.getContext('2d');
const tempCtx = tempCanvas.getContext('2d', { alpha: true });

const lineColor = "#4CAF50";
const gridColor = "#666";

let currentTool = "cursor";
let events = [];
let redoEvents = [];
let currentLine = null;
let isDrawing = false;

window.versions.onToolChanged((tool) => {
    currentTool = tool;
});

window.versions.onHistoryAction((action) => {
    if (action == "undo" && events.length > 0) {
        redoEvents.push(events.pop());
        refresh();
    } else if (action == "redo" && redoEvents.length > 0) {
        events.push(redoEvents.pop());
        refresh();
    }
});

function invalidateRedo() {
    redoEvents = [];
}

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    tempCanvas.width = window.innerWidth;
    tempCanvas.height = window.innerHeight;
}

function findNearestGridPoint(x, y) {
    let gridX = Math.round(x / gridSpacing) * gridSpacing;
    let gridY = Math.round(y / gridSpacing) * gridSpacing;

    if (gridX == 0 || gridX == gridSpacing) { gridX = gridSpacing * 2; }
    if (gridY == 0 || gridY == gridSpacing) { gridY = gridSpacing * 2; }

    return { x: gridX - 10, y: gridY - 10 };
}

function pointToNode(point) {
    const { x, y } = findNearestGridPoint(point.x, point.y);
    const node = {
        x: x / gridSpacing,
        y: y / gridSpacing
    };
    return node;
}

function nodeToPoint(node) {
    const { x, y } = node;
    const point = {
        x: x * gridSpacing,
        y: y * gridSpacing
    };
}

function getMousePosition(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

// Draw grid of dots
function drawGrid() {
    ctx.fillStyle = gridColor;
    
    // Calculate number of dots based on canvas dimensions
    const numDotsX = Math.floor((canvas.width - 50) / gridSpacing);
    const numDotsY = Math.floor((canvas.height - 50) / gridSpacing);
    
    for(let x = 0; x < numDotsX; x++) {
        for(let y = 0; y < numDotsY; y++) {
            ctx.beginPath();
            ctx.arc(x * gridSpacing + 50, y * gridSpacing + 50, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function highlightClosestNode(e, canvasContext = tempCtx) {
    const mousePos = getMousePosition(e);
    const nearestPoint = findNearestGridPoint(mousePos.x, mousePos.y);
    canvasContext.beginPath();
    canvasContext.arc(nearestPoint.x, nearestPoint.y, 4, 0, Math.PI * 2);
    canvasContext.fillStyle = lineColor;
    canvasContext.fill();
}

function drawLine(data) {
    const { start, end } = data;
    console.log("Drawing line from " + start.x + "," + start.y + " to " + end.x + "," + end.y);
    this.beginPath();
    this.moveTo(start.x, start.y);
    this.lineTo(end.x, end.y);
    this.strokeStyle = lineColor;
    this.lineWidth = 2;
    this.stroke();
}

function refresh() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resizeCanvas();
    drawGrid();
    events.forEach(event => {
        console.log("Drawing event " + event.handler + " " + event.data);
        event.handler.call(ctx, event.data);
    });
}

// Symbol funcs ---------------------------------------

// e -- the event that triggered the drag.
// drawFunc -- the function to draw the symbol.
// createDataFunc -- the function to create the input data for drawFunc.
// nodeList -- the list of connector points for the symbol. Each point is
// a node-vector relative to the current mouse position.
function dragSymbol(e, drawFunc, createDataFunc, nodeList) {
    // Clear the temporary canvas
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Highlight the connector points
    for (let i = 0; i < nodeList.length; i++) {
        let e2 = {
            clientX: e.clientX + nodeList[i].x * gridSpacing,
            clientY: e.clientY + nodeList[i].y * gridSpacing
        };
        highlightClosestNode(e2);
    }

    // Draw the symbol
    drawFunc.call(tempCtx, createDataFunc(e));
}

function dropSymbol(e, drawFunc, createDataFunc, nodeList) {
    const data = createDataFunc(e);
    events.push({
        handler: drawFunc,
        data: data
    });
    drawFunc.call(ctx, data);
    invalidateRedo();
}

// Wire funcs ---------------------------------------
function startWire(e) {
    const mousePos = getMousePosition(e);
    
    isDrawing = true;
    const nearestPoint = findNearestGridPoint(mousePos.x, mousePos.y);
    currentLine = {
        start: nearestPoint,
        end: nearestPoint
    };
}

function drawWire(data) {
    drawLine.call(this, data);

    // Highlight the end points
    let lineStart = {clientX: data.start.x, clientY: data.start.y};
    let lineEnd = {clientX: data.end.x, clientY: data.end.y};
    highlightClosestNode(lineStart, this);
    highlightClosestNode(lineEnd, this);
}

function moveWire(e) {
    // Clear only the temporary canvas and draw the current line
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

    if (!isDrawing) return;
    
    const mousePos = getMousePosition(e);
    
    const nearestPoint = findNearestGridPoint(mousePos.x, mousePos.y);
    currentLine.end = nearestPoint;

    // Draw the line
    drawWire.call(tempCtx, {start: currentLine.start, end: currentLine.end});
}

function endWire() {
    if (!isDrawing) return;

    if (currentLine.start.x == currentLine.end.x &&
         currentLine.start.y == currentLine.end.y) {
        isDrawing = false;
        currentLine = null;
        return;
    }
    
    // Add the completed line to our events array
    events.push({
        handler: drawWire,
        data: {
            start: { x: currentLine.start.x, y: currentLine.start.y },
            end: { x: currentLine.end.x, y: currentLine.end.y }
        }
    });
    
    // Clear the temporary canvas
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the final line on the main canvas
    drawWire.call(ctx, {start: currentLine.start, end: currentLine.end});

    
    isDrawing = false;
    currentLine = null;
    invalidateRedo();
}
// -----------------------------------------------------
// Battery funcs ---------------------------------------
// -----------------------------------------------------
function drawBatterySymbol(data) {
    const { x, y, rotation } = data;
    this.save(); // Save the current state
    this.translate(x, y); // Move to the center point
    this.rotate(rotation * Math.PI / 180); // Convert degrees to radians
    
    // Battery dimensions
    const width = 30;
    const gap = 15;
    
    // Draw the positive (longer) terminal
    this.beginPath();
    this.moveTo(-width/2, -gap/2);
    this.lineTo(width/2, -gap/2);
    this.strokeStyle = lineColor;
    this.lineWidth = 4;
    this.stroke();
    
    // Draw the negative (shorter) terminal
    this.beginPath();
    this.moveTo(-width/4, gap/2);
    this.lineTo(width/4, gap/2);
    this.strokeStyle = lineColor;
    this.lineWidth = 4;
    this.stroke();
    
    this.restore(); // Restore the original state
}

function createBatteryData(e) {
    const mousePos = getMousePosition(e);
    let point = findNearestGridPoint(mousePos.x, mousePos.y);
    point.x += gridSpacing/2;
    return {x: point.x, y: point.y, rotation: 90};
}

// -----------------------------------------------------
// Resistor funcs ---------------------------------------
// -----------------------------------------------------

function drawResistorSymbol(data) {
    const { x, y, rotation } = data;
    this.save();
    this.translate(x, y);
    this.rotate(rotation * Math.PI / 180);
    
    // Resistor dimensions
    const width = gridSpacing * .8;
    const height = gridSpacing * .5;
    const segments = 6;
    
    this.beginPath();
    this.moveTo(-width/2, 0);
    
    // Draw zigzag pattern
    const segmentWidth = width / segments;
    for (let i = 1; i <= segments - 1; i++) {
        const x = -width/2 + i * segmentWidth;
        const y = (i % 2 === 0) ? -height/2 : height/2;
        this.lineTo(x, y);
    }

    const endX = -width/2 + segments * segmentWidth;
    const endY = 0;
    this.lineTo(endX, endY);
    
    this.strokeStyle = lineColor;
    this.lineWidth = 2;
    this.stroke();
    this.restore();
}

function createResistorData(e) {
    const mousePos = getMousePosition(e);
    let point = findNearestGridPoint(mousePos.x, mousePos.y);
    point.x += gridSpacing/2;
    return {x: point.x, y: point.y, rotation: 0};
}

// -----------------------------------------------------
// Ground funcs ---------------------------------------
// -----------------------------------------------------
function drawGroundSymbol(data) {
    const { x, y, rotation } = data;
    this.save();
    this.translate(x, y);
    this.rotate(rotation * Math.PI / 180);
    
    // Ground symbol dimensions
    const width = 20;
    const spacing = 4;
    const lines = 3;
    
    // Draw vertical line
    this.beginPath();
    this.moveTo(0, 0);
    this.lineTo(0, spacing);
    this.strokeStyle = lineColor;
    this.lineWidth = 2;
    this.stroke();
    
    // Draw horizontal lines
    for(let i = 0; i < lines; i++) {
        const currentWidth = width - (i * 6);
        this.beginPath();
        this.moveTo(-currentWidth/2, (i + 2) * spacing);
        this.lineTo(currentWidth/2, (i + 2) * spacing);
        this.stroke();
    }
    
    this.restore();
}

function createGroundData(e) {
    const mousePos = getMousePosition(e);
    let point = findNearestGridPoint(mousePos.x, mousePos.y);
    return {x: point.x, y: point.y, rotation: 0};
}

// -----------------------------------------------------
// MOSFET funcs ---------------------------------------
// -----------------------------------------------------
function drawMosfetSymbol(data) {
    const { x, y, rotation } = data;
    this.save();
    this.translate(x, y);
    this.rotate(rotation * Math.PI / 180);
    
    // MOSFET dimensions
    const width = gridSpacing;
    const height = gridSpacing * 1.2;
    
    this.strokeStyle = lineColor;
    this.lineWidth = 2;
    
    // Draw vertical channel line
    this.beginPath();
    this.moveTo(0, -height/2);
    this.lineTo(0, height/2);
    this.stroke();
    
    // Draw source and drain connections
    this.beginPath();
    this.moveTo(0, -height/3);
    this.lineTo(width/2, -height/3);
    this.moveTo(0, height/3);
    this.lineTo(width/2, height/3);
    this.stroke();
    
    // Draw gate
    this.beginPath();
    this.moveTo(-width/3, 0);
    this.lineTo(-width/6, 0);
    this.stroke();
    
    // Draw gate terminal
    this.beginPath();
    this.moveTo(-width/3, -height/4);
    this.lineTo(-width/3, height/4);
    this.stroke();
    
    this.restore();
}

function createMosfetData(e) {
    const mousePos = getMousePosition(e);
    let point = findNearestGridPoint(mousePos.x, mousePos.y);
    return {x: point.x, y: point.y, rotation: 0};
}

// -----------------------------------------------------
// Event listeners -------------------------------------
// -----------------------------------------------------

canvas.addEventListener('mousedown', (e) => {
    if (currentTool == "wire") {
        startWire(e);
    } 
});

canvas.addEventListener('mousemove', (e) => {
    if (currentTool == "cursor") {
        // Clear the temporary canvas
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

        highlightClosestNode(e);
    } else if (currentTool == "wire") {
        moveWire(e);
        highlightClosestNode(e);
    } else if (currentTool == "battery") {
        dragSymbol(e, drawBatterySymbol, createBatteryData, [
            {x: 0, y: 0},
            {x: 1, y: 0}
        ]);
    } else if (currentTool == "resistor") {
        dragSymbol(e, drawResistorSymbol, createResistorData, [
            {x: 0, y: 0},
            {x: 1, y: 0}
        ]);
    } else if (currentTool == "ground") {
        dragSymbol(e, drawGroundSymbol, createGroundData, [
            {x: 0, y: 0}
        ]);
    } else if (currentTool == "mosfet") {
        dragSymbol(e, drawMosfetSymbol, createMosfetData, [
            {x: -1, y: 0},
            {x: 0, y: 1},
            {x: 0, y: -1}
        ]);
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (currentTool == "wire") {
        endWire();
    } 
});        

canvas.addEventListener('click', (e) => {
    if (currentTool == "battery") {
        dropSymbol(e, drawBatterySymbol, createBatteryData, [
            {x: 0, y: 0},
            {x: 1, y: 0}
        ]);
    } else if (currentTool == "resistor") {
        dropSymbol(e, drawResistorSymbol, createResistorData, [
            {x: 0, y: 0},
            {x: 1, y: 0}
        ]);
    } else if (currentTool == "ground") {
        dropSymbol(e, drawGroundSymbol, createGroundData, [
            {x: 0, y: 0}
        ]);
    } else if (currentTool == "mosfet") {
        dropSymbol(e, drawMosfetSymbol, createMosfetData, [
            {x: -1, y: 0},
            {x: 0, y: 1},
            {x: 0, y: -1}
        ]);
    }
});

canvas.addEventListener('mouseleave', (e) => {
    // Clear the temporary canvas
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Reset drawing states
    isDrawing = false;
    currentLine = null;
});

// -----------------------------------------------------
// Initial setup ---------------------------------------
// -----------------------------------------------------
window.addEventListener('resize', refresh);
refresh();