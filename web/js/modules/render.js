import { Globals } from "./globals.js";
import { trimBrackets } from "./utils.js";
import * as Utils from "./utils.js";

// in charge of drawing DOM elements

//TODO remove onclick and instead add event listeners

export function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = text.split(/\s+/);
    let lines = [];
    let line = "";

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const { width } = ctx.measureText(testLine);

        if (width > maxWidth && line !== "") {
            lines.push(line.trim());
            line = words[i] + " ";
            if (lines.length >= maxLines) break;
        } else {
            line = testLine;
        }
    }

    if (lines.length < maxLines && line.trim() !== "") {
        lines.push(line.trim());
    }

    // Center vertically
    const totalHeight = lines.length * lineHeight;
    let startY = y - totalHeight / 2 + lineHeight / 2;

    lines.forEach((ln, idx) => {
        ctx.fillText(ln, x, startY + idx * lineHeight);
    });
}

// create fallback PNG image
function makeFallbackDataURL(entry, size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const rgb = entry.RGB || [128, 128, 128];
    ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    ctx.fillRect(0, 0, size, size);

    const fontSize = Math.floor(size / 5);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(0, 0, 0, 1)";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 3;

    drawWrappedText(ctx, entry.Name, size / 2, size / 2, size - 4, fontSize + 2, 3);

    return canvas.toDataURL();
}

export function preloadFallbackIcons(sizes = [32, 48, 64]) {
    if (!Globals.colorDB) return;

    Globals.colorDB.forEach((entry) => {
        const guid = entry.GUID;

        // Only preload for entries that don't have image sources defined
        if (!entry.imageSource) {
            sizes.forEach((size) => {
                const cacheKey = `${guid}_${size}`;
                if (!Globals.fallbackCache[cacheKey]) {
                    const dataURL = makeFallbackDataURL(entry, size);
                    Globals.fallbackCache[cacheKey] = dataURL;
                }
            });
        }
    });
}

// Generates an <img> OR a fallback <canvas> with the Name drawn over the RGB background
export function createItemPreview(entry, size = Globals.ICON_DIMS) {
    const guid = entry.GUID;
    const cacheKey = `${guid}_${size}`;

    // If matching-size fallback exists, reuse it
    if (Globals.fallbackCache[cacheKey]) {
        const img = document.createElement("img");
        img.src = Globals.fallbackCache[cacheKey];
        img.width = size;
        img.height = size;
        img.alt = entry.Name;
        img.dataset.guid = guid;
        return img;
    }

    // Otherwise create normal image
    const img = document.createElement("img");
    img.src = entry.imageSource;
    img.alt = entry.Name;
    img.width = size;
    img.height = size;
    img.dataset.guid = guid;

    // Hook the onerror to generate fallback
    img.onerror = function () {
        console.warn("Image missing, generating fallback for:", entry.Name);

        // get fallback canvas PNG
        const dataURL = makeFallbackDataURL(entry, size);

        // Cache it so we never redraw or re-error again
        Globals.fallbackCache[cacheKey] = dataURL;

        // load PNG in place
        img.src = dataURL;
    };

    return img;
}

export function renderPreview() {
    let chunkX = parseInt(Globals.chunkInputX.value) - 1;
    let chunkY = parseInt(Globals.chunkInputY.value) - 1;
    let previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25);

    // clear preview grid before drawing
    for (let row of Globals.previewCells) {
        for (let cell of row) {
            cell.style.backgroundColor = "transparent";
            cell.src = "images/misc/empty.png";
        }
    }

    for (let y = 0, gy = chunkY * previewCellsDims; y < previewCellsDims; y++, gy++) {
        for (let x = 0, gx = chunkX * previewCellsDims; x < previewCellsDims; x++, gx++) {
            if (gy <= Globals.cachedData.length - 1 && gx <= Globals.cachedData[y].length - 1) {
                let selection = Globals.cachedData[gy][gx];
                const existingCell = Globals.previewCells[y][x];
                Globals.previewCells[y][x].style.backgroundColor = "rgba(" + trimBrackets(selection["RGB"]) + ", 255)";

                // previewCells[y][x].src = selection['imageSource']
                // Use fallback-aware preview generator for each preview cell
                let preview = createItemPreview(selection, Globals.ICON_DIMS); // replace 30px preview grid cells
                preview.id = existingCell.id;

                Globals.previewCells[y][x].replaceWith(preview);

                // And update local reference since replaceWith() swaps DOM nodes
                Globals.previewCells[y][x] = preview;
            } else {
                Globals.previewCells[y][x].style.backgroundColor = "transparent";
                Globals.previewCells[y][x].src = "images/misc/empty.png";
            }
        }
    }
    document.dispatchEvent(new Event("renderPreviewComplete"));
}

export function buildPreviewCellsArray() {
    // clear preview grid before drawing
    for (let row of Globals.previewCells) {
        for (let cell of row) {
            cell.style.backgroundColor = "transparent";
            cell.src = "images/misc/empty.png";
            // cell.src = "";
            cell.width = 0;
            cell.height = 0;
            cell.alt = "";
            cell.GUID = -1;
        }
    }

    Globals.previewCells = [];

    // let previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25);
    // always create full 25x25 cell preview cell ids
    const previewCellsDims = 25;

    // populate Globals.previewCells
    for (let y = 0; y < previewCellsDims; y++) {
        for (let x = 0; x < previewCellsDims; x++) {
            let id = "cell-" + x + "-" + y;
            let cell = document.getElementById(id);
            Globals.previewCells.push(cell);
        }
    }
    // TODO optimize, eliminate this matrix conversion
    // convert to 2d array
    Globals.previewCells = Utils.convertToMatrix(Globals.previewCells, previewCellsDims);
    console.log("preview grid cells updated");
    console.log(Globals.previewCells);
}

export function generateItemSelection(db) {
    // load previous states (name: {guid, checked})
    let savedStates = JSON.parse(localStorage.getItem("cktool-checkbox-states") || "{}");

    // MIGRATION: Old format was (guid: bool)
    const isV1SavedStates = Object.keys(savedStates).length > 0 && typeof Object.values(savedStates)[0] === "boolean";
    if (isV1SavedStates) {
        const migrated = {};
        for (const [guidStr, checked] of Object.entries(savedStates)) {
            const guid = Number(guidStr);
            const entry = db[guid];
            if (entry) {
                migrated[entry.Name] = { guid, checked };
            }
        }
        savedStates = migrated;
        localStorage.setItem("cktool-checkbox-states", JSON.stringify(savedStates));
    }

    db.forEach((entry) => {
        const nameKey = entry.Name;
        const guid = entry.GUID;

        // if no saved data, default to checked
        if (!savedStates[nameKey]) {
            savedStates[nameKey] = { guid, checked: true };
        }

        // === UI creation ===
        let container = document.createElement("label");
        container.className = "item-selection";

        let checkBox = document.createElement("input");
        checkBox.type = "checkbox";
        checkBox.setAttribute("name", "item-selection");
        checkBox.setAttribute("guid", guid);

        // load checked state
        checkBox.checked = savedStates[nameKey].checked;

        // update saved state on change
        checkBox.addEventListener("change", () => {
            savedStates[nameKey] = { guid, checked: checkBox.checked };
            localStorage.setItem("cktool-checkbox-states", JSON.stringify(savedStates));
        });

        let preview = createItemPreview(entry, Globals.ICON_DIMS);
        preview.dataset.guid = guid;

        // assemble container
        container.appendChild(checkBox);
        container.appendChild(preview);

        // label text (inside the <label> so it's clickable too)
        let nameSpan = document.createElement("span");
        nameSpan.textContent = entry.Name;
        container.appendChild(nameSpan);

        Globals.itemSelectionsDOM.appendChild(container);
    });
}

export function redrawIconImages() {
    const newSize = Globals.ICON_DIMS;

    // Update item-selection icons
    document.querySelectorAll(".item-selection img").forEach((img) => {
        const guid = Number(img.dataset.guid);
        const entry = Globals.colorDB[guid];

        const newPreview = createItemPreview(entry, newSize);
        img.src = newPreview.src;
    });

    // Update item-counter icons
    document.querySelectorAll(".item-counter img").forEach((img) => {
        const guid = Number(img.dataset.guid);
        const entry = Globals.colorDB[guid];

        const newPreview = createItemPreview(entry, newSize);
        img.src = newPreview.src;
    });
}

///====  togglers

export function toggleImages() {
    if (Globals.showImageInputs) {
        Globals.imageInputsDOM.setAttribute("style", "display:none !important");
    } else {
        Globals.imageInputsDOM.setAttribute("style", "");
    }
    Globals.showImageInputs = !Globals.showImageInputs;
}

export function toggleColorSelection() {
    if (Globals.showSelections) {
        Globals.itemSelectionsDOM.setAttribute("style", "display:none !important");
    } else {
        Globals.itemSelectionsDOM.setAttribute("style", "");
    }
    Globals.showSelections = !Globals.showSelections;
}

export function toggleCounterSelection() {
    if (Globals.showCounters) {
        Globals.itemCountersDOM.setAttribute("style", "display:none !important");
    } else {
        Globals.itemCountersDOM.setAttribute("style", "");
    }
    Globals.showCounters = !Globals.showCounters;
}

// TODO
export function resetPreviews() {
    // if (!previewCells === undefined || !previewCells.length == 0) {
    //     console.log("Resetting previews")
    //     previewCells.forEach(element => {
    //         element.src = "images/misc/empty.png"
    //         element.style.backgroundColor = "transparent"
    //     })
    // }
}
// #endregion
