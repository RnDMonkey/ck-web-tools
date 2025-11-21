// Written by Randy Panopio 
// import { getColorDict } from './modules/colordb.js'

// NOTE
// so I could convert the db to override it to have keys based on current selected colorspace. EG key would be rgba
// this means when doing  color tone mapping, we have an rgb/color value and use that key to lookup which image to render on preview cells

// #region Globals
var colorDB = null

// Loaded image's processed data
var cachedData = []
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

// #endregion

// #region preview table construction
function buildPreviewTable(tableDims = 25) {
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
    const reader = new FileReader()

    reader.addEventListener("load", () => {
        resetPreviews()
        const uploaded_image = reader.result

        imgDom.src = `${uploaded_image}`
        
        console.log("Uploaded W: " + imgDom.naturalWidth + ", H: " + imgDom.naturalHeight)
    })

    reader.readAsDataURL(this.files[0])
})
// #endregion

// #region Core Functions

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
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
function createItemPreview(entry, size = IMAGE_DIMS) {

    const guid = entry.GUID;

    // If fallback already cached → skip drawing, just return an <img> with cached data
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

        // Convert fallback canvas → PNG
        const dataURL = canvas.toDataURL();

        // 4) Cache it so we never redraw or re-error again
        fallbackCache[guid] = dataURL;

        // 5) Replace image immediately
        img.src = dataURL;
    };

    return img;
}

function processImage() {
    itemCountersDOM.innerHTML = ''
    if (imgDom.naturalWidth > maxDims || imgDom.naturalHeight > maxDims) {  
        console.error("Image too large / not supported!")
        window.alert("Image too large / not supported!")
        return
    }
    console.log("Processing currently uploaded image")
    // NAIVE IMPLEMENTATION OF ITEM COUNTER
    let counters = {} // kvp 

    // let previewCellsDims = parseInt(gridSizeDOM.value) > 25 ? 25 : parseInt(gridSizeDOM.value)
    let previewCellsDims = Math.min(parseInt(gridSizeDOM.value), 25);

    // Rebuild dynamic table when processing image
    // buildPreviewTable(previewCellsDims);

    // get the uploaded image from the dom and draw it on a hidden canvas, this is how we get pixel data
    uploadedImage.crossOrigin = "Anonymous" // CORS
    const hiddenCanvas = document.createElement('canvas')
    hiddenCanvas.width = maxDims
    hiddenCanvas.height = maxDims
    const ictx = hiddenCanvas.getContext('2d')
    ictx.drawImage(uploadedImage, 0, 0)
    let loadedImageCanvasData = ictx.getImageData(0, 0, uploadedImage.naturalWidth, uploadedImage.naturalHeight);
    console.log("Loaded Image data: ")
    console.log(loadedImageCanvasData)

    let width = loadedImageCanvasData.width
    let height = loadedImageCanvasData.height

    let outputCanvas = document.getElementById("output-canvas")
    let octx = outputCanvas.getContext("2d")
    
    // fit width for pixel scale
    let pixelSize = 1 + Math.trunc(2000 / width)
    let canvasPixelWidth = width * pixelSize
    let canvasPixelHeight = height * pixelSize
    outputCanvas.width = canvasPixelWidth
    outputCanvas.height = canvasPixelHeight


    // TODO optimize by just looping pixel data once. 
    // flatten array to rgb array
    let rgbArray = []
    for (let i = 0; i < loadedImageCanvasData.data.length; i += 4) {
        rgbArray.push([loadedImageCanvasData.data[i], loadedImageCanvasData.data[i + 1], loadedImageCanvasData.data[i + 2]])
    }
    console.log("rgbArray")
    console.log(rgbArray)
    
    // convert to 2d array
    let pixel2dArray = convertToMatrix(rgbArray, width)
    // while(rgbArray.length) pixel2dArray.push(rgbArray.splice(0, width))
    console.log("pixel2dArray")
    console.log(pixel2dArray)
    //===== array remap finsih

    // Color/Item selection 
    //=====================
    //TODO i dont have time to figure out a solution so doing it this way
    // items to remove from db by collecting all guid (in reality they are indexes) to remove
    // this is done by iterating over the checkboxes of the item selection (which should have a guid attribute) and create an array from it
    // rearrange this array to remove to ascending
    // then use that arranged idexes to start splicing a copy of the colordb
    let colorIdsToExclude = []
    //NOTE I had another idea where instead of looping, you add and remove colors from the exckdue array, but this is fine
    const itemSelectionCheckboxes = document.querySelectorAll("input[type=checkbox][name=item-selection]")
    itemSelectionCheckboxes.forEach(element => {
        if (!element.checked) {
            let guid = parseInt(element.getAttribute("guid"))
            console.log("removing guid : " + guid)
            colorIdsToExclude.push(guid)
        }
    })
    // TODO figure out why its not updating this again after claling this function after the first time
    colorIdsToExclude.sort()
    let colorDBCache = getExcludedColorDB(colorDB, colorIdsToExclude) // pass colordb to to remove selected items
   
    // reset cachedData
    cachedData = []
    cachedData = Array.from(Array(height), () => new Array(width))
    console.log("========== cleared cachedData")
    console.log(cachedData)

    //========FINAL LOOP======//
    // iterate over 2d matrix and print each pixel after mapping 
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let _r = pixel2dArray[y][x][0] //Math.floor(Math.random() * 256)
            let _g = pixel2dArray[y][x][1] //Math.floor(Math.random() * 256)
            let _b = pixel2dArray[y][x][2] //Math.floor(Math.random() * 256)

            // TODO optimize by caching already mapped color values instead of doing another loop of getting closest colour    
            let colorSpace = "RGB"
            let closestValue = getDBClosestValue(colorDBCache, [_r, _g, _b], colorSpace)
            cachedData[y][x] = closestValue

            // Fill in canvas preview
            octx.fillStyle = "rgba(" + trimBrackets(closestValue[colorSpace]) + ", 255)"
            octx.fillRect(x * pixelSize, y * pixelSize, 1 * pixelSize, 1 * pixelSize)

            // Increment the item counter
            let guid = closestValue["GUID"]
            if (guid in counters) {
                counters[guid] = counters[guid] += 1 
            } else {
                counters[guid] = 1
            }
        }
    }

    console.log("counters")
    console.log(counters)
    // Update Item counters
    itemCountersDOM.innerHTML = ''
    for (let key in counters) {
        let container = document.createElement("div")
        container.setAttribute("class", "item-counter")
        let label = document.createElement("label")

        // let image = document.createElement("img")
        // image.src = colorDB[key]["imageSource"]
        // image.style.backgroundColor = "rgba(" + trimBrackets(colorDB[key]['RGB']) + ", 255)"
        // container.appendChild(image)

        let entry = colorDB[key];
        let preview = createItemPreview(entry, IMAGE_DIMS); // size adjustable

        container.appendChild(preview);
        container.appendChild(label)
        itemCountersDOM.appendChild(container)

        label.appendChild(document.createTextNode(colorDB[key]["Name"] + " - " + counters[key]))
    }

    const offset = 0.5 // not even sure if this is useful
    if (showGridLinesDOM.checked) {
        octx.lineWidth = parseInt(gridThicknessInput.value)
        octx.strokeStyle = "black"

        for (let x = 0; x < canvasPixelWidth; x += pixelSize * previewCellsDims) {
            octx.moveTo(offset + x, 0)
            octx.lineTo(offset + x, canvasPixelHeight)
        }   
    
        for (let x = 0; x < canvasPixelHeight; x += pixelSize * previewCellsDims) {
            octx.moveTo(0, offset + x)
            octx.lineTo(canvasPixelWidth, offset + x)
        }
        octx.stroke();
    }
    
    console.log("cachedData")
    console.log(cachedData)

    // TODO use uri/imagedata encoding, though not sure if thats more performant than looping
    console.log("out canvas pixel dims " + outputCanvas.width / pixelSize + ", " + outputCanvas.height / pixelSize)
}
