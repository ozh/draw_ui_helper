const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");

let shapes = [];
let selectedShapeIndex = null;
let currentTool = "rectangle";
let isDrawing = false;
let startX, startY;
let gridSize = 10;
const gridInput = document.getElementById("gridSize");
const minSize = 3; // taille minimale pour créer une forme
let draggingHandle = null;
let offsetX, offsetY;
let bgImage = null;
let bgPattern = null;

const bgInput = document.getElementById("bgImageUpload");
bgInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) {
        bgImage = null;
        bgPattern = null;
        redraw();
        return;
    }
    const img = new Image();
    img.onload = () => {
        bgImage = img;
        bgPattern = ctx.createPattern(bgImage, "repeat");
        redraw();
    };
    img.src = URL.createObjectURL(file);
});

let bgOpacity = 1.0; // 0 = invisible, 1 = opaque

const bgOpacityInput = document.getElementById("bgOpacity");
const opacityValueSpan = document.getElementById("opacityValue");

bgOpacityInput.addEventListener("input", () => {
    bgOpacity = bgOpacityInput.value / 100;
    opacityValueSpan.textContent = `${bgOpacityInput.value}%`;
    redraw();
});


// Création du cadre
document.getElementById("createFrame").addEventListener("click", () => {
    const w = parseInt(document.getElementById("frameWidth").value);
    const h = parseInt(document.getElementById("frameHeight").value);
    gridSize = parseInt(gridInput.value);
    if (isNaN(gridSize) || gridSize < 0) gridSize = 10;
    if (gridSize > 100) gridSize = 100;
    gridInput.value = gridSize;

    canvas.width = w;
    canvas.height = h;
    shapes = [];
    selectedShapeIndex = null;

    ctx.clearRect(0, 0, w, h);
    drawGrid();

    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
    ctx.lineWidth = 1;
    updateShapeInfo();
    redraw();
});

// Sélection forme à dessiner
document.getElementById("drawShape").addEventListener("change", e => {
    currentTool = e.target.value;
});

// Suppression bouton
document.getElementById("deleteShape").addEventListener("click", () => {
    if (selectedShapeIndex !== null) {
        shapes.splice(selectedShapeIndex, 1);
        selectedShapeIndex = null;
        updateShapeInfo();
        redraw();
    }
});

// Suppression touche Suppr
document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" && selectedShapeIndex !== null) {
        shapes.splice(selectedShapeIndex, 1);
        selectedShapeIndex = null;
        updateShapeInfo();
        redraw();
    }
});

// Modification en live taille grille
gridInput.addEventListener("input", () => {
    let val = parseInt(gridInput.value);
    if (isNaN(val) || val < 0) val = 0;
    else if (val > 100) val = 100;
    gridInput.value = val;
    gridSize = val;
    redraw();
});

// Mouse events
canvas.addEventListener("mousedown", (e) => {
    const { x, y } = getMousePos(e);
    const handle = getHandleAt(x, y);
    if (handle) {
        draggingHandle = handle;
        return;
    }
    const clickedIndex = getShapeAt(x, y);
    if (clickedIndex !== null) {
        selectedShapeIndex = clickedIndex;
        offsetX = x - shapes[clickedIndex].x;
        offsetY = y - shapes[clickedIndex].y;
        draggingHandle = null;
        isDrawing = false;
        redraw();
        updateShapeInfo();
    } else {
        // Commencer dessin nouvelle forme
        isDrawing = true;
        startX = snap(x);
        startY = snap(y);
        selectedShapeIndex = null;
        updateShapeInfo();
    }
});

canvas.addEventListener("mousemove", (e) => {
    const { x, y } = getMousePos(e);
    if (draggingHandle !== null && selectedShapeIndex !== null) {
        resizeShape(draggingHandle, snap(x), snap(y));
        redraw();
        updateShapeInfo();
        return;
    }
    if (isDrawing) {
        redraw();
        drawTempShape(startX, startY, snap(x), snap(y), currentTool);
    } else if (selectedShapeIndex !== null && e.buttons) {
        let s = shapes[selectedShapeIndex];
        s.x = snap(x - offsetX);
        s.y = snap(y - offsetY);
        redraw();
        updateShapeInfo();
    }
});

canvas.addEventListener("mouseup", (e) => {
    if (draggingHandle !== null) {
        draggingHandle = null;
        return;
    }
    if (isDrawing) {
        const { x, y } = getMousePos(e);
        const endX = snap(x);
        const endY = snap(y);
        const w = Math.abs(endX - startX);
        const h = Math.abs(endY - startY);
        if (w >= minSize && h >= minSize) {
            shapes.push({
                type: currentTool,
                x: Math.min(startX, endX),
                y: Math.min(startY, endY),
                w: w,
                h: h
            });
            selectedShapeIndex = shapes.length - 1;
        }
        isDrawing = false;
        redraw();
        updateShapeInfo();
    }
});

// Fonctions utilitaires
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function snap(val) {
    return (gridSize && gridSize >= 1) ? Math.round(val / gridSize) * gridSize : val;
}

function drawGrid() {
    if (!gridSize || gridSize < 1) return; // pas de grille si 0 ou <1
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawTempShape(x1, y1, x2, y2, type) {
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (type === "rectangle") ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    else if (type === "ellipse") {
        ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (type === "circle") {
        let r = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
        ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, r, r, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (type === "line") {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgPattern) {
        ctx.save();
        ctx.globalAlpha = bgOpacity;
        ctx.fillStyle = bgPattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    } else {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawGrid();

    shapes.forEach((s, i) => {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        if (s.type === "rectangle") ctx.strokeRect(s.x, s.y, s.w, s.h);
        else if (s.type === "ellipse") {
            ctx.beginPath();
            ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w) / 2, Math.abs(s.h) / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (s.type === "circle") {
            ctx.beginPath();
            ctx.ellipse(s.x + s.w / 2, s.y + s.w / 2, Math.abs(s.w) / 2, Math.abs(s.w) / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (s.type === "line") {
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x + s.w, s.y + s.h);
            ctx.stroke();
        }
        if (i === selectedShapeIndex) drawHandles(s);
    });
}

function getShapeAt(x, y) {
    for (let i = shapes.length - 1; i >= 0; i--) {
        let s = shapes[i];
        let minX = Math.min(s.x, s.x + s.w);
        let maxX = Math.max(s.x, s.x + s.w);
        let minY = Math.min(s.y, s.y + s.h);
        let maxY = Math.max(s.y, s.y + s.h);
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            return i;
        }
    }
    return null;
}

function drawHandles(s) {
    ctx.fillStyle = "red";
    let points = [];

    if (s.type === "circle") {
        // Handles milieu des 4 côtés
        const cx = s.x + s.w / 2;
        const cy = s.y + s.h / 2;
        points = [
            [s.x, cy],
            [s.x + s.w, cy],
            [cx, s.y],
            [cx, s.y + s.h]
        ];
    } else {
        points = [
            [s.x, s.y],
            [s.x + s.w, s.y],
            [s.x, s.y + s.h],
            [s.x + s.w, s.y + s.h]
        ];
    }

    points.forEach(([px, py]) => {
        ctx.fillRect(px - 4, py - 4, 8, 8);
    });
}

function getHandleAt(x, y) {
    if (selectedShapeIndex === null) return null;
    let s = shapes[selectedShapeIndex];
    let handles = [];

    if (s.type === "circle") {
        const cx = s.x + s.w / 2;
        const cy = s.y + s.h / 2;
        handles = [
            { name: "left", x: s.x, y: cy },
            { name: "right", x: s.x + s.w, y: cy },
            { name: "top", x: cx, y: s.y },
            { name: "bottom", x: cx, y: s.y + s.h }
        ];
    } else {
        handles = [
            { name: "tl", x: s.x, y: s.y },
            { name: "tr", x: s.x + s.w, y: s.y },
            { name: "bl", x: s.x, y: s.y + s.h },
            { name: "br", x: s.x + s.w, y: s.y + s.h }
        ];
    }

    return handles.find(h => Math.abs(x - h.x) <= 5 && Math.abs(y - h.y) <= 5);
}

function resizeShape(handle, newX, newY) {
    let s = shapes[selectedShapeIndex];
    if (!s) return;

    if (s.type === "circle") {
        const cx = s.x + s.w / 2;
        const cy = s.y + s.h / 2;

        if (handle.name === "left") {
            let newW = (cx - newX) * 2;
            if (newW > minSize) {
                s.w = newW;
                s.h = newW;
                s.x = cx - s.w / 2;
                s.y = cy - s.h / 2;
            }
        } else if (handle.name === "right") {
            let newW = (newX - cx) * 2;
            if (newW > minSize) {
                s.w = newW;
                s.h = newW;
                s.x = cx - s.w / 2;
                s.y = cy - s.h / 2;
            }
        } else if (handle.name === "top") {
            let newH = (cy - newY) * 2;
            if (newH > minSize) {
                s.h = newH;
                s.w = newH;
                s.x = cx - s.w / 2;
                s.y = cy - s.h / 2;
            }
        } else if (handle.name === "bottom") {
            let newH = (newY - cy) * 2;
            if (newH > minSize) {
                s.h = newH;
                s.w = newH;
                s.x = cx - s.w / 2;
                s.y = cy - s.h / 2;
            }
        }
    } else {
        switch (handle.name) {
            case "tl":
                s.w += s.x - newX;
                s.h += s.y - newY;
                s.x = newX;
                s.y = newY;
                break;
            case "tr":
                s.w = newX - s.x;
                s.h += s.y - newY;
                s.y = newY;
                break;
            case "bl":
                s.w += s.x - newX;
                s.x = newX;
                s.h = newY - s.y;
                break;
            case "br":
                s.w = newX - s.x;
                s.h = newY - s.y;
                break;
        }
    }
}

function updateShapeInfo() {
    const infoDiv = document.getElementById("shapeInfo");
    infoDiv.innerHTML = "";
    shapes.forEach((s, i) => {
        const div = document.createElement("div");
        div.classList.add("shape-item");
        if (i === selectedShapeIndex) div.classList.add("selected");

        let coordsText = "";
        if (s.type === "line") {
            const x0 = Math.min(s.x, s.x + s.w);
            const y0 = Math.min(s.y, s.y + s.h);
            const x1 = Math.max(s.x, s.x + s.w);
            const y1 = Math.max(s.y, s.y + s.h);
            coordsText = `.line([ ${x0}, ${y0}, ${x1}, ${y1} ])`;
        } else if (s.type === "circle") {
            const r = Math.abs(s.w) / 2;
            const cx = s.x + s.w / 2;
            const cy = s.y + s.h / 2;
            coordsText = `.circle([ ${cx}, ${cy}], radius=${r})`;
        } else {
            coordsText = `.${s.type}([ ${s.x}, ${s.y}, ${s.x + s.w}, ${s.y + s.h} ])`;
        }

        const textSpan = document.createElement("span");
        textSpan.textContent = coordsText;
        textSpan.style.cursor = "pointer";
        textSpan.addEventListener("click", () => {
            selectedShapeIndex = i;
            redraw();
            updateShapeInfo();
            // copie dans le clipboard
            navigator.clipboard.writeText(textSpan.textContent)
                .then(() => {
                    // Optionnel: Indiquer que c’est copié, par exemple un petit flash ou console.log
                    console.log("Coordonnées copiées !");
                })
                .catch(() => {
                    alert("Impossible de copier dans le presse-papiers");
                });
        });
        div.appendChild(textSpan);

        const trash = document.createElement("span");
        trash.textContent = " 🗑";
        trash.style.cursor = "pointer";
        trash.style.marginLeft = "10px";
        trash.title = "Supprimer cette forme";
        trash.addEventListener("click", (ev) => {
            ev.stopPropagation();
            shapes.splice(i, 1);
            if (selectedShapeIndex === i) selectedShapeIndex = null;
            else if (selectedShapeIndex > i) selectedShapeIndex--;
            updateShapeInfo();
            redraw();
        });
        div.appendChild(trash);

        infoDiv.appendChild(div);
    });
}
