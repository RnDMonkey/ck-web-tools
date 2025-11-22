// Written by Randy Panopio 
// import { getColorDict } from './modules/colordb.js'

// NOTE
// so I could convert the db to override it to have keys based on current selected colorspace. EG key would be rgba
// this means when doing  color tone mapping, we have an rgb/color value and use that key to lookup which image to render on preview cells

// #region Globals
var colorDB = null
var CAM16_J_WEIGHT = 100.0

// Loaded image's processed data
var cachedData = []
var pixelRGB   = [];   // [ [ [r,g,b], ... ], ... ]
var pixelHSL   = [];   // [ [ [h,s,l], ... ], ... ]
var pixelHSV   = [];   // [ [ [h,s,v], ... ], ... ]
var pixelCAM16 = [];   // [ [ [J', a', b'], ... ], ... ]
const fallbackCache = {}; // GUID -> dataURL

// Table previews
var previewCells = []
const maxDims = 500
const IMAGE_DIMS = 64

var showImageInputs = true
var showSelections = true
var showCounters = true
// #endregion

// #region DOM selectors
const chunkInputX = document.getElementById("chunk-input-x")
const chunkInputY = document.getElementById("chunk-input-y")
const showGridLinesDOM = document.getElementById("show-grid-lines")
const gridThicknessInput = document.getElementById("grid-thickness")
const imageUpload = document.getElementById("image-upload")
const imgDom = document.getElementById("upload-preview")
const previewTable = document.getElementById("preview-table")
const uploadedImage = document.getElementById("upload-preview")
const gridSizeDOM = document.getElementById("grid-size")
const imageInputsDOM = document.getElementById("image-inputs")
const itemSelectionsDOM = document.getElementById("item-selections")
const itemCountersDOM = document.getElementById("item-counters")
const processModeSelect = document.getElementById("process-options");
const cam16WeightContainer = document.getElementById("cam16-weight-container");
const cam16WeightInput = document.getElementById("cam16-weight");

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
            img.width = IMAGE_DIMS;
            img.height = IMAGE_DIMS;
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
async function Initialize() {
    // Build dynamic table BEFORE collecting previewCells
    // buildPreviewTable(25);

    // colorDB = getColorDB()
    colorDB = await getColorDB("data/colordb.json");
    // should this be async?
    generateItemSelection(colorDB)

    // Restore saved cam16 weight
    const savedWeight = localStorage.getItem("cktool-cam16-weight");
    if (savedWeight) {
        cam16WeightInput.value = savedWeight;
    }
    
    cam16WeightInput.addEventListener("input", () => {  
        CAM16_J_WEIGHT = parseFloat(cam16WeightInput.value);
        if (imgDom.src && imgDom.naturalWidth) {
            processImage();
        }
    });
    
    cam16WeightInput.addEventListener("change", () => {
        localStorage.setItem("cktool-cam16-weight", cam16WeightInput.value);
        CAM16_J_WEIGHT = parseFloat(cam16WeightInput.value);
        if (imgDom.src && imgDom.naturalWidth) {
            processImage();
        }
    });
    
    // Restore saved mode
    const savedMode = localStorage.getItem("cktool-process-mode");
    if (savedMode) {
        processModeSelect.value = savedMode;
        
        // toggle cam16-weight input visibility
        cam16WeightContainer.style.display =
            (processModeSelect.value === "CAM16") ? "inline-block" : "none";
    }
    
    // Save mode + auto-reprocess when changed
    processModeSelect.addEventListener("change", () => {
        localStorage.setItem("cktool-process-mode", processModeSelect.value);

        // toggle cam16-weight input visibility
        cam16WeightContainer.style.display =
            (processModeSelect.value === "CAM16") ? "inline-block" : "none";
    
        if (imgDom.src && imgDom.naturalWidth > 0) {
            processImage();   // auto-process like palette checkbox changes
        }
    });

    // Restore saved grid size
    const savedGridSize = localStorage.getItem("cktool-grid-size");
    if (savedGridSize) {
        gridSizeDOM.value = savedGridSize;
    }
    
    // Save grid size + auto-reprocess when changed
    gridSizeDOM.addEventListener("change", () => {
        localStorage.setItem("cktool-grid-size", gridSizeDOM.value);
        
        if (imgDom.src && imgDom.naturalWidth > 0) {
            processImage();   // auto-process like palette checkbox changes
        }
    });

    // let previewCellsDims = parseInt(gridSizeDOM.value) > 25 ? 25 : parseInt(gridSizeDOM.value)
    let previewCellsDims = Math.min(parseInt(gridSizeDOM.value), 25);

    // populate previewCells
    for (let y = 0; y < previewCellsDims; y++) {
        for (let x = 0; x < previewCellsDims; x++) {
            let id = "cell-"+ x + "-" + y 
            let cell = document.getElementById(id)
            previewCells.push(cell)
        }
    }
    // TODO optimize, eliminate this matrix conversion
    // convert to 2d array
    previewCells = convertToMatrix(previewCells, previewCellsDims)
    console.log("preview grid cells")
    console.log(previewCells)
}

document.addEventListener("DOMContentLoaded", function(){
     Initialize();
})

imageUpload.addEventListener("change", function () {
    console.log("Image input change event triggered, opening fs")

    const reader = new FileReader();

    reader.onload = () => {
        resetPreviews();

        imgDom.onload = () => {
            console.log("Image fully loaded, building caches…");
            buildPixelCaches();
            // processImage(); // optional auto-process
        };

        imgDom.src = reader.result;
        console.log("Uploaded W: " + imgDom.naturalWidth + ", H: " + imgDom.naturalHeight)
    };

    reader.readAsDataURL(this.files[0]);
});

// #endregion

// #region Core Functions

export function buildPixelCaches() {
    if (!uploadedImage.naturalWidth || !uploadedImage.naturalHeight) {
        console.warn("buildPixelCaches() called before image loaded.");
        return;
    }

    const width = uploadedImage.naturalWidth;
    const height = uploadedImage.naturalHeight;

    pixelRGB   = [];
    pixelHSL   = [];
    pixelHSV   = [];
    pixelCAM16 = [];

    // Draw image onto hidden canvas
    const hiddenCanvas = document.createElement("canvas");
    hiddenCanvas.width = width;
    hiddenCanvas.height = height;
    const ctx = hiddenCanvas.getContext("2d");
    ctx.drawImage(uploadedImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height).data;

    let i = 0;
    for (let y = 0; y < height; y++) {

        pixelRGB[y]   = [];
        pixelHSL[y]   = [];
        pixelHSV[y]   = [];
        pixelCAM16[y] = [];

        for (let x = 0; x < width; x++) {

            const r = imgData[i++];
            const g = imgData[i++];
            const b = imgData[i++];
            i++; // skip alpha

            pixelRGB[y][x]   = [r, g, b];
            pixelHSL[y][x]   = rgbToHSL(r, g, b);
            pixelHSV[y][x]   = rgbToHSV(r, g, b);
            pixelCAM16[y][x] = rgbToCAM16UCS(r, g, b);
        }
    }

    console.log("pixelRGB / pixelHSL / pixelHSV / pixelCAM16 built.");
    console.log("HSL sanity check:");
    console.log(colorDB[0].HSL);
    console.log(rgbToHSL(...colorDB[0].RGB));
    console.log(distHSL(colorDB[0].HSL, rgbToHSL(...colorDB[0].RGB)));
    console.log("HSV sanity check:");
    console.log(colorDB[0].HSV);
    console.log(rgbToHSV(...colorDB[0].RGB));
    console.log(distHSV(colorDB[0].HSV, rgbToHSV(...colorDB[0].RGB)));
    console.log("CAM16 sanity check:");
    console.log(colorDB[0].CAM16);
    console.log(rgbToCAM16UCS(...colorDB[0].RGB));
    console.log(distCAM16(colorDB[0].CAM16, rgbToCAM16UCS(...colorDB[0].RGB)));
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
export function createItemPreview(entry, size = IMAGE_DIMS) {

    const guid = entry.GUID;

    // If fallback already cached ? skip drawing, just return an <img> with cached data
    if (fallbackCache[guid]) {
        const img = document.createElement("img");
        img.src = fallbackCache[guid];
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
        fallbackCache[guid] = dataURL;

        // 5) Replace image immediately
        img.src = dataURL;
    };

    return img;
}

export function processImage() {
    itemCountersDOM.innerHTML = '';

    // Basic image sanity checks
    if (!imgDom.naturalWidth || !imgDom.naturalHeight) {
        console.error("No image loaded.");
        window.alert("Please load an image first.");
        return;
    }

    if (imgDom.naturalWidth > maxDims || imgDom.naturalHeight > maxDims) {
        console.error("Image too large / not supported!");
        window.alert("Image too large / not supported!");
        return;
    }

    console.log("Processing currently uploaded image");

    const width  = imgDom.naturalWidth;
    const height = imgDom.naturalHeight;

    // Ensure caches exist / match current image size
    if (!pixelRGB.length ||
        pixelRGB.length !== height ||
        pixelRGB[0].length !== width) {
        console.warn("Pixel caches missing or mismatched – rebuilding.");
        buildPixelCaches();
    }

    // Item counters
    let counters = {};

    // Grid size for overlay
    let previewCellsDims = Math.min(parseInt(gridSizeDOM.value), 25);

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
    let colorDBCache = getExcludedColorDB(colorDB, colorIdsToExclude);

    // Reset cachedData for this run
    cachedData = Array.from({ length: height }, () => new Array(width));
    console.log("========== cleared cachedData");
    console.log(cachedData);

    //======== FINAL LOOP ======//
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            const colorSpace = document.getElementById("process-options").value;

            // Fast lookup from cached color-space arrays
            const inputColor =
                (colorSpace === "RGB")   ? pixelRGB[y][x]   :
                (colorSpace === "HSL")   ? pixelHSL[y][x]   :
                (colorSpace === "HSV")   ? pixelHSV[y][x]   :
                (colorSpace === "CAM16") ? pixelCAM16[y][x] :
                                            pixelRGB[y][x]; // fallback

            // Find best palette match
            const closestValue = getDBClosestValue(colorDBCache, inputColor, colorSpace);
            cachedData[y][x] = closestValue;

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
    itemCountersDOM.innerHTML = '';
    for (let key in counters) {
        let container = document.createElement("div");
        container.setAttribute("class", "item-counter");
        let label = document.createElement("label");

        let entry = colorDB[key];
        let preview = createItemPreview(entry, IMAGE_DIMS);

        container.appendChild(preview);
        container.appendChild(label);
        itemCountersDOM.appendChild(container);

        label.appendChild(
            document.createTextNode(colorDB[key]["Name"] + " - " + counters[key])
        );
    }

    const offset = 0.5;
    if (showGridLinesDOM.checked) {
        octx.lineWidth = parseInt(gridThicknessInput.value);
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

    console.log("cachedData");
    console.log(cachedData);
    console.log("out canvas pixel dims " +
        outputCanvas.width / pixelSize + ", " +
        outputCanvas.height / pixelSize);
}
