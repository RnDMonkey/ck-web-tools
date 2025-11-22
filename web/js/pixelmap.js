// Written by Randy Panopio 
import * as Globals from "./modules/globals.js";
// import * as Main from "./main.js";
import { getColorDB } from './modules/colordb.js';
import { rgbToHSL, rgbToHSV, rgbToCAM16UCS, distRGB, distHSL, distHSV, distCAM16, getDBClosestValue, convertToMatrix, trimBrackets, addToColorExclusion, removeColorFromExclusion, getExcludedColorDB } from './modules/utils.js';
import { renderPreview, generateItemSelection, toggleImages, toggleColorSelection, toggleCounterSelection, resetPreviews } from './modules/render.js';

// NOTE
// so I could convert the db to override it to have keys based on current selected colorspace. EG key would be rgba
// this means when doing  color tone mapping, we have an rgb/color value and use that key to lookup which image to render on preview cells

// #region Globals (most/all moved to globals.js)

// #endregion

// #region preview table construction
export function buildPreviewTable(tableDims = 25) {
    const tbl = document.getElementById("preview-table");
    tbl.innerHTML = ""; // clear existing

    for (let y = 0; y < tableDims; y++) {
        const row = document.createElement("tr");
        row.id = `preview-row-${y}`;

        for (let x = 0; x < tableDims; x++) {
            const cell = document.createElement("td");

            const img = document.createElement("img");
            img.id = `cell-${x}-${y}`;
            img.className = "preview-cell";
            img.width = Globals.IMAGE_DIMS;
            img.height = Globals.IMAGE_DIMS;
            img.src = "images/misc/empty.png";

            // Clean layout: no squeeze, no distort
            img.style.display = "block";

            cell.appendChild(img);
            row.appendChild(cell);
        }

        tbl.appendChild(row);
    }
}
// #endregion

// #region Initialization and Hooked Event Listeners
export async function Initialize() {
    // Build dynamic table BEFORE collecting Globals.previewCells
    // buildPreviewTable(25);

    // Globals.colorDB = getColorDB()
    Globals.colorDB = await getColorDB("data/colordb.json");
    // should this be async?
    generateItemSelection(Globals.colorDB)

    // Restore saved cam16 weight
    const savedWeight = localStorage.getItem("cktool-cam16-weight");
    if (savedWeight) {
        Globals.cam16WeightInput.value = savedWeight;
    }
    
    Globals.cam16WeightInput.addEventListener("input", () => {  
        Globals.CAM16_J_WEIGHT = parseFloat(Globals.cam16WeightInput.value);
        if (Globals.imgDom.src && Globals.imgDom.naturalWidth) {
            processImage();
        }
    });
    
    Globals.cam16WeightInput.addEventListener("change", () => {
        localStorage.setItem("cktool-cam16-weight", Globals.cam16WeightInput.value);
        Globals.CAM16_J_WEIGHT = parseFloat(Globals.cam16WeightInput.value);
        if (Globals.imgDom.src && Globals.imgDom.naturalWidth) {
            processImage();
        }
    });
    
    // Restore saved mode
    const savedMode = localStorage.getItem("cktool-process-mode");
    if (savedMode) {
        Globals.processModeSelect.value = savedMode;
        
        // toggle cam16-weight input visibility
        Globals.cam16WeightContainer.style.display =
            (Globals.processModeSelect.value === "CAM16") ? "inline-block" : "none";
    }
    
    // Save mode + auto-reprocess when changed
    Globals.processModeSelect.addEventListener("change", () => {
        localStorage.setItem("cktool-process-mode", Globals.processModeSelect.value);

        // toggle cam16-weight input visibility
        Globals.cam16WeightContainer.style.display =
            (Globals.processModeSelect.value === "CAM16") ? "inline-block" : "none";
    
        if (Globals.imgDom.src && Globals.imgDom.naturalWidth > 0) {
            processImage();   // auto-process like palette checkbox changes
        }
    });

    // Restore saved grid size
    const savedGridSize = localStorage.getItem("cktool-grid-size");
    if (savedGridSize) {
        Globals.gridSizeDOM.value = savedGridSize;
    }
    
    // Save grid size + auto-reprocess when changed
    Globals.gridSizeDOM.addEventListener("change", () => {
        localStorage.setItem("cktool-grid-size", Globals.gridSizeDOM.value);
        
        if (Globals.imgDom.src && Globals.imgDom.naturalWidth > 0) {
            processImage();   // auto-process like palette checkbox changes
        }
    });

    // let previewCellsDims = parseInt(Globals.gridSizeDOM.value) > 25 ? 25 : parseInt(Globals.gridSizeDOM.value)
    let previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25);

    // populate Globals.previewCells
    for (let y = 0; y < previewCellsDims; y++) {
        for (let x = 0; x < previewCellsDims; x++) {
            let id = "cell-"+ x + "-" + y 
            let cell = document.getElementById(id)
            Globals.previewCells.push(cell)
        }
    }
    // TODO optimize, eliminate this matrix conversion
    // convert to 2d array
    Globals.previewCells = convertToMatrix(Globals.previewCells, previewCellsDims)
    console.log("preview grid cells")
    console.log(Globals.previewCells)

    // #region Button listeners
    Globals.btnToggleColors.addEventListener("click", toggleColorSelection);
    Globals.btnToggleCounters.addEventListener("click", toggleCounterSelection);
    Globals.btnToggleImages.addEventListener("click", toggleImages);
    Globals.btnProcess.addEventListener("click", processImage);
    Globals.btnRenderPreview.addEventListener("click", renderPreview);
    // #endregion
}

document.addEventListener("DOMContentLoaded", function(){
     Initialize();
})

Globals.imageUpload.addEventListener("change", function () {
    console.log("Image input change event triggered, opening fs")

    const reader = new FileReader();

    reader.onload = () => {
        resetPreviews();

        Globals.imgDom.onload = () => {
            console.log("Image fully loaded, building caches…");
            buildPixelCaches();
            // processImage(); // optional auto-process
        };

        Globals.imgDom.src = reader.result;
        console.log("Uploaded W: " + Globals.imgDom.naturalWidth + ", H: " + Globals.imgDom.naturalHeight)
    };

    reader.readAsDataURL(this.files[0]);
});

// #endregion

// #region Core Functions

export function buildPixelCaches() {
    if (!Globals.uploadedImage.naturalWidth || !Globals.uploadedImage.naturalHeight) {
        console.warn("buildPixelCaches() called before image loaded.");
        return;
    }

    const width = Globals.uploadedImage.naturalWidth;
    const height = Globals.uploadedImage.naturalHeight;

    Globals.pixelRGB   = [];
    Globals.pixelHSL   = [];
    Globals.pixelHSV   = [];
    Globals.pixelCAM16 = [];

    // Draw image onto hidden canvas
    const hiddenCanvas = document.createElement("canvas");
    hiddenCanvas.width = width;
    hiddenCanvas.height = height;
    const ctx = hiddenCanvas.getContext("2d");
    ctx.drawImage(Globals.uploadedImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height).data;

    let i = 0;
    for (let y = 0; y < height; y++) {

        Globals.pixelRGB[y]   = [];
        Globals.pixelHSL[y]   = [];
        Globals.pixelHSV[y]   = [];
        Globals.pixelCAM16[y] = [];

        for (let x = 0; x < width; x++) {

            const r = imgData[i++];
            const g = imgData[i++];
            const b = imgData[i++];
            i++; // skip alpha

            Globals.pixelRGB[y][x]   = [r, g, b];
            Globals.pixelHSL[y][x]   = rgbToHSL(r, g, b);
            Globals.pixelHSV[y][x]   = rgbToHSV(r, g, b);
            Globals.pixelCAM16[y][x] = rgbToCAM16UCS(r, g, b);
        }
    }

    console.log("Globals.pixelRGB / Globals.pixelHSL / Globals.pixelHSV / Globals.pixelCAM16 built.");
    console.log("HSL sanity check:");
    console.log(Globals.colorDB[0].HSL);
    console.log(rgbToHSL(...Globals.colorDB[0].RGB));
    console.log(distHSL(Globals.colorDB[0].HSL, rgbToHSL(...Globals.colorDB[0].RGB)));
    console.log("HSV sanity check:");
    console.log(Globals.colorDB[0].HSV);
    console.log(rgbToHSV(...Globals.colorDB[0].RGB));
    console.log(distHSV(Globals.colorDB[0].HSV, rgbToHSV(...Globals.colorDB[0].RGB)));
    console.log("CAM16 sanity check:");
    console.log(Globals.colorDB[0].CAM16);
    console.log(rgbToCAM16UCS(...Globals.colorDB[0].RGB));
    console.log(distCAM16(Globals.colorDB[0].CAM16, rgbToCAM16UCS(...Globals.colorDB[0].RGB)));
}

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

// Generates an <img> OR a fallback <canvas> with the Name drawn over the RGB background
export function createItemPreview(entry, size = Globals.IMAGE_DIMS) {

    const guid = entry.GUID;

    // If fallback already cached ? skip drawing, just return an <img> with cached data
    if (Globals.fallbackCache[guid]) {
        const img = document.createElement("img");
        img.src = Globals.fallbackCache[guid];
        img.width = size;
        img.height = size;
        img.alt = entry.Name;
        return img;
    }

    // Otherwise create normal image
    const img = document.createElement("img");
    img.src = entry.imageSource;
    img.alt = entry.Name;
    img.width = size;
    img.height = size;

    // Hook the onerror to generate fallback
    img.onerror = function () {

        console.warn("Image missing, generating fallback for:", entry.Name);

        // Create fallback canvas
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        // Background color from RGB
        const rgb = entry.RGB || [128, 128, 128];
        ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        ctx.fillRect(0, 0, size, size);

        // Draw the wrapped Name text
        const fontSize = Math.floor(size / 5);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";

        drawWrappedText(
            ctx,
            entry.Name,
            size / 2,
            size / 2,
            size - 4,
            fontSize + 2,
            3
        );

        // Convert fallback canvas ? PNG
        const dataURL = canvas.toDataURL();

        // 4) Cache it so we never redraw or re-error again
        Globals.fallbackCache[guid] = dataURL;

        // 5) Replace image immediately
        img.src = dataURL;
    };

    return img;
}

export function processImage() {
    Globals.itemCountersDOM.innerHTML = '';

    // Basic image sanity checks
    if (!Globals.imgDom.naturalWidth || !Globals.imgDom.naturalHeight) {
        console.error("No image loaded.");
        window.alert("Please load an image first.");
        return;
    }

    if (Globals.imgDom.naturalWidth > Globals.maxDims || Globals.imgDom.naturalHeight > Globals.maxDims) {
        console.error("Image too large / not supported!");
        window.alert("Image too large / not supported!");
        return;
    }

    console.log("Processing currently uploaded image");

    const width  = Globals.imgDom.naturalWidth;
    const height = Globals.imgDom.naturalHeight;

    // Ensure caches exist / match current image size
    if (!Globals.pixelRGB.length ||
        Globals.pixelRGB.length !== height ||
        Globals.pixelRGB[0].length !== width) {
        console.warn("Pixel caches missing or mismatched – rebuilding.");
        buildPixelCaches();
    }

    // Item counters
    let counters = {};

    // Grid size for overlay
    let previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25);

    // Output canvas + sizing
    const outputCanvas = document.getElementById("output-canvas");
    const octx = outputCanvas.getContext("2d");

    const pixelSize        = 1 + Math.trunc(2000 / width);
    const canvasPixelWidth = width  * pixelSize;
    const canvasPixelHeight = height * pixelSize;

    outputCanvas.width  = canvasPixelWidth;
    outputCanvas.height = canvasPixelHeight;

    // Color / item selection filtering
    let colorIdsToExclude = [];
    const itemSelectionCheckboxes =
        document.querySelectorAll("input[type=checkbox][name=item-selection]");

    itemSelectionCheckboxes.forEach(element => {
        if (!element.checked) {
            let guid = parseInt(element.getAttribute("guid"));
            console.log("removing guid : " + guid);
            colorIdsToExclude.push(guid);
        }
    });

    colorIdsToExclude.sort();
    let colorDBCache = getExcludedColorDB(Globals.colorDB, colorIdsToExclude);

    // Reset Globals.cachedData for this run
    Globals.cachedData = Array.from({ length: height }, () => new Array(width));
    console.log("========== cleared Globals.cachedData");
    console.log(Globals.cachedData);

    //======== FINAL LOOP ======//
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            const colorSpace = document.getElementById("process-options").value;

            // Fast lookup from cached color-space arrays
            const inputColor =
                (colorSpace === "RGB")   ? Globals.pixelRGB[y][x]   :
                (colorSpace === "HSL")   ? Globals.pixelHSL[y][x]   :
                (colorSpace === "HSV")   ? Globals.pixelHSV[y][x]   :
                (colorSpace === "CAM16") ? Globals.pixelCAM16[y][x] :
                                            Globals.pixelRGB[y][x]; // fallback

            // Find best palette match
            const closestValue = getDBClosestValue(colorDBCache, inputColor, colorSpace);
            Globals.cachedData[y][x] = closestValue;

            // Always draw using the palette's RGB, regardless of comparison space
            const rgb = closestValue.RGB;
            octx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 255)`;
            octx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);

            // Count items
            const guid = closestValue.GUID;
            counters[guid] = (counters[guid] || 0) + 1;
        }
    }

    console.log("counters");
    console.log(counters);

    // Update Item counters UI
    Globals.itemCountersDOM.innerHTML = '';
    for (let key in counters) {
        let container = document.createElement("div");
        container.setAttribute("class", "item-counter");
        let label = document.createElement("label");

        let entry = Globals.colorDB[key];
        let preview = createItemPreview(entry, Globals.IMAGE_DIMS);

        container.appendChild(preview);
        container.appendChild(label);
        Globals.itemCountersDOM.appendChild(container);

        label.appendChild(
            document.createTextNode(Globals.colorDB[key]["Name"] + " - " + counters[key])
        );
    }

    const offset = 0.5;
    if (Globals.showGridLinesDOM.checked) {
        octx.lineWidth = parseInt(Globals.gridThicknessInput.value);
        octx.strokeStyle = "black";

        for (let x = 0; x < canvasPixelWidth; x += pixelSize * previewCellsDims) {
            octx.moveTo(offset + x, 0);
            octx.lineTo(offset + x, canvasPixelHeight);
        }

        for (let y = 0; y < canvasPixelHeight; y += pixelSize * previewCellsDims) {
            octx.moveTo(0, offset + y);
            octx.lineTo(canvasPixelWidth, offset + y);
        }
        octx.stroke();
    }

    console.log("Globals.cachedData");
    console.log(Globals.cachedData);
    console.log("out canvas pixel dims " +
        outputCanvas.width / pixelSize + ", " +
        outputCanvas.height / pixelSize);
}
