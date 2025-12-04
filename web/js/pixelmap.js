// Originally written by Randy Panopio, resurrected by Ryan Rutledge
import { Globals, initGlobals } from "./modules/globals.js";
import { getColorDB, writeGimpPalette } from "./modules/colordb.js";
import * as Utils from "./modules/utils.js";
import * as Render from "./modules/render.js";

// #region Globals (most/all moved to globals.js)

// #endregion

// #region preview table construction (unused at this time)
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
            img.style.backgroundColor = "transparent";
            // img.width = Globals.ICON_DIMS;
            // img.height = Globals.ICON_DIMS;
            img.src = "images/misc/empty.png";

            img.style.display = "block";

            cell.appendChild(img);
            row.appendChild(cell);
        }

        tbl.appendChild(row);
    }
}

function updateMaxDims(isLargerAllowed) {
    Globals.maxDims = isLargerAllowed ? Globals.LARGE_MAXDIMS : Globals.NORMAL_MAXDIMS;
}

function loadImageFromDataURL(dataURL, options = {}) {
    if (!dataURL) return;

    const { allowLargeDims = false, overlayMessage = "Loading image..." } = options;

    showProgressOverlay(overlayMessage);

    // Set maxDims depending on where the image came from
    updateMaxDims(allowLargeDims);

    // Clear preview state before loading new image
    Render.resetPreviewCells();

    Globals.imageEpoch++;
    const thisCacheBuildEpoch = Globals.imageEpoch;

    Globals.uploadedImageDOM.onload = async () => {
        try {
            console.log("Image loaded, building caches…");
            await buildPixelCaches(thisCacheBuildEpoch);
            await processImage();
        } finally {
            hideProgressOverlay();
        }
    };

    Globals.uploadedImageDOM.onerror = () => {
        console.error("Failed to load image from data URL");
        hideProgressOverlay();
    };

    Globals.uploadedImageDOM.src = dataURL;
    console.log(
        "Uploaded W: " + Globals.uploadedImageDOM.naturalWidth + ", H: " + Globals.uploadedImageDOM.naturalHeight
    );
}

// #endregion

// #region Initialization and Hooked Event Listeners
export async function Initialize() {
    initGlobals();
    showProgressOverlay("Loading page...");

    restorePaneSizes();
    setupDragBar("drag-bar-left", "left-pane", true);
    setupDragBar("drag-bar-right", "right-pane", false);

    Globals.colorDB = await getColorDB("data/colordb.json");

    // preload fallback icon images at all supported sizes
    Render.preloadFallbackIcons([32, 48, 64]);

    // #region icon size choice
    // Restore saved icon size choice
    const savedIconSize = localStorage.getItem("cktool-icon-size");
    if (savedIconSize) {
        Globals.iconSizeSelectDOM.value = savedIconSize;
        const newIconSize = parseInt(savedIconSize);
        // Update global var
        Globals.ICON_DIMS = newIconSize;
        // Update CSS var
        document.documentElement.style.setProperty("--icon-size", `${newIconSize}px`);
    }

    // Register for icon size changes
    Globals.iconSizeSelectDOM.addEventListener("change", () => {
        localStorage.setItem("cktool-icon-size", Globals.iconSizeSelectDOM.value);
        const newIconSize = parseInt(Globals.iconSizeSelectDOM.value);
        // Update global var
        Globals.ICON_DIMS = newIconSize;
        // Update CSS var
        document.documentElement.style.setProperty("--icon-size", `${newIconSize}px`);

        // Re-render icon images at new size
        Render.redrawIconImages();
        processImage();
    });

    // Render item icon images after reading icon size preference, then hook listeners
    Render.generateItemSelection(Globals.colorDB); // generate icon images for item selection, etc.
    registerPaletteCheckboxHandlers();
    registerCounterClickHandlers();
    registerGridNavigationHandlers();
    // #endregion

    // #region color matching mode
    // Restore saved cam16 weight
    const savedWeight = localStorage.getItem("cktool-cam16-weight");
    if (savedWeight) {
        Globals.cam16WeightInputDOM.value = savedWeight;
        Globals.CAM16_J_WEIGHT = parseFloat(Globals.cam16WeightInputDOM.value);
    }

    Globals.cam16WeightInputDOM.addEventListener("input", () => {
        Globals.CAM16_J_WEIGHT = parseFloat(Globals.cam16WeightInputDOM.value);
        if (!Globals.isImageEmpty) {
            processImage();
        }
    });

    Globals.cam16WeightInputDOM.addEventListener("change", () => {
        localStorage.setItem("cktool-cam16-weight", Globals.cam16WeightInputDOM.value);
        Globals.CAM16_J_WEIGHT = parseFloat(Globals.cam16WeightInputDOM.value);
        if (!Globals.isImageEmpty) {
            processImage();
        }
    });

    // Restore saved mode + update cam16-weight input visibility
    const savedMode = localStorage.getItem("cktool-process-mode");
    if (savedMode) {
        Globals.processModeSelectDOM.value = savedMode;

        // toggle cam16-weight input visibility
        Globals.cam16WeightContainerDOM.style.display =
            Globals.processModeSelectDOM.value === "CAM16" ? "inline-block" : "none";
    }

    // Save mode + auto-reprocess when changed
    Globals.processModeSelectDOM.addEventListener("change", () => {
        localStorage.setItem("cktool-process-mode", Globals.processModeSelectDOM.value);

        // toggle cam16-weight input visibility
        Globals.cam16WeightContainerDOM.style.display =
            Globals.processModeSelectDOM.value === "CAM16" ? "inline-block" : "none";

        if (!Globals.isImageEmpty) {
            processImage(); // auto-process like palette checkbox changes
        }
    });
    // #endregion

    // Restore saved grid size
    const savedGridSize = localStorage.getItem("cktool-grid-size");
    if (savedGridSize) {
        Globals.gridSizeDOM.value = savedGridSize;
    }

    // Save grid size + auto-reprocess when changed
    Globals.gridSizeDOM.addEventListener("change", () => {
        localStorage.setItem("cktool-grid-size", Globals.gridSizeDOM.value);

        if (!Globals.isImageEmpty) {
            Render.buildPreviewCellsArray();
            processImage(); // auto-process like palette checkbox changes
        }
    });

    // populate Globals.previewCells
    Render.buildPreviewCellsArray();

    // fire off drawSelectionFromInputs any time renderPreviewComplete event fires
    document.addEventListener("renderPreviewComplete", () => {
        drawSelectionFromInputs();
    });

    // #region Button listeners
    Globals.btnToggleColorsDOM.addEventListener("click", Render.toggleColorSelection);
    Globals.btnToggleCountersDOM.addEventListener("click", Render.toggleCounterSelection);
    // Globals.btnToggleImages.addEventListener("click", Render.toggleImages);
    Globals.btnProcess.addEventListener("click", processImage);
    Globals.btnRenderPreview.addEventListener("click", Render.renderPreview);
    Globals.btnDownloadGIMP.addEventListener("click", () => {
        writeGimpPalette(Globals.colorDB);
    });
    // #endregion

    Globals.btnClearSuppressedDOM.addEventListener("click", () => {
        Globals.tempSuppressed.clear();
        updateSuppressionUI();

        // Remove visual cue
        document.querySelectorAll(".item-counter.suppressed").forEach((el) => el.classList.remove("suppressed"));

        if (!Globals.isImageEmpty) {
            processImage();
        }
    });

    // ===============================
    // Cached Image Support - KEEP LAST in Initialize()
    // ===============================
    const CACHE_KEY = "cktool-cached-image";

    // Restore cache-image checkbox state (default: true)
    const savedFlag = localStorage.getItem("cktool-image-cache-enabled");
    if (!savedFlag) {
        Globals.allowCachedImageDOM.checked = true;
    } else {
        Globals.allowCachedImageDOM.checked = savedFlag === "true";
    }

    // Show button if cached image exists
    if (localStorage.getItem(CACHE_KEY)) {
        Globals.btnClearImageCacheDOM.style.display = "inline-block";
    }

    // Save cache-image checkbox state
    Globals.allowCachedImageDOM.addEventListener("change", () => {
        localStorage.setItem("cktool-image-cache-enabled", Globals.allowCachedImageDOM.checked);
        if (Globals.allowCachedImageDOM.checked) {
            if (!Globals.isImageEmpty) {
                localStorage.setItem(CACHE_KEY, Globals.uploadedImageDOM.src);
                Globals.btnClearImageCacheDOM.style.display = "inline-block";
            }
        } else {
            localStorage.removeItem(CACHE_KEY);
            Globals.btnClearImageCacheDOM.style.display = "none";
        }
    });

    // check for cached image
    const cachedImageDataURL = localStorage.getItem(CACHE_KEY);
    if (cachedImageDataURL) {
        Globals.btnClearImageCacheDOM.style.display = "inline-block";
    } else {
        Globals.btnClearImageCacheDOM.style.display = "none";
    }

    // load cached image if present and cache enabled
    if (cachedImageDataURL && Globals.allowCachedImageDOM.checked) {
        loadImageFromDataURL(cachedImageDataURL, {
            allowLargeDims: true,
            overlayMessage: "Loading cached image..."
        });
    } else {
        // No cached image to load; hide overlay if we showed it at top
        hideProgressOverlay();
    }

    // handle new image uploads
    Globals.imageUploadDOM.addEventListener("change", function () {
        console.log("Image input change event triggered, opening fs");

        const file = this.files[0];
        if (!file) return;

        showProgressOverlay("Uploading file...");

        const reader = new FileReader();

        reader.onload = () => {
            const dataURL = reader.result;

            if (Globals.allowCachedImageDOM.checked) {
                localStorage.setItem(CACHE_KEY, dataURL);
                Globals.btnClearImageCacheDOM.style.display = "inline-block";
            }

            loadImageFromDataURL(dataURL, {
                allowLargeDims: false,
                overlayMessage: "Uploading file..."
            });
        };

        reader.readAsDataURL(file);
    });

    // Clear cached image (stored only, not loaded image)
    Globals.btnClearImageCacheDOM.addEventListener("click", () => {
        localStorage.removeItem(CACHE_KEY);
        Globals.btnClearImageCacheDOM.style.display = "none";

        Globals.allowCachedImageDOM.checked = false;
        localStorage.setItem("cktool-image-cache-enabled", Globals.allowCachedImageDOM.checked);
    });
}

function registerPaletteCheckboxHandlers() {
    document.querySelectorAll("input[type=checkbox][name=item-selection]").forEach((cb) => {
        cb.addEventListener("change", () => {
            if (!Globals.isImageEmpty) {
                processImage();
            }
        });
    });
}

function registerCounterClickHandlers() {
    Globals.itemCountersDOM.addEventListener("click", (e) => {
        const container = e.target.closest(".item-counter");
        if (!container) return;

        const guid = Number(container.dataset.guid);

        // Toggle suppression
        if (Globals.tempSuppressed.has(guid)) {
            Globals.tempSuppressed.delete(guid);
            container.classList.remove("suppressed");
        } else {
            Globals.tempSuppressed.add(guid);
            container.classList.add("suppressed");
        }

        updateSuppressionUI();

        if (!Globals.isImageEmpty) {
            processImage();
        }
    });
}

function updateSuppressionUI() {
    const count = Globals.tempSuppressed.size;

    const countSpan = document.getElementById("suppression-count");
    const btnClearSuppressed = document.getElementById("btn-clear-suppressed");

    countSpan.textContent = count;

    // Disable button if nothing to clear
    btnClearSuppressed.disabled = count === 0;
}

function savePaneSizes() {
    const left = document.getElementById("left-pane").style.flexBasis;
    const right = document.getElementById("right-pane").style.flexBasis;

    localStorage.setItem("cktool-left-pane-width", left);
    localStorage.setItem("cktool-right-pane-width", right);
}

function restorePaneSizes() {
    const left = localStorage.getItem("cktool-left-pane-width");
    const right = localStorage.getItem("cktool-right-pane-width");

    if (left) {
        document.getElementById("left-pane").style.flexBasis = left;
    }

    if (right) {
        document.getElementById("right-pane").style.flexBasis = right;
    }
}

function setupDragBar(dragBarId, targetPaneId, isLeftBar) {
    const dragBar = document.getElementById(dragBarId);
    const targetPane = document.getElementById(targetPaneId);

    let isDragging = false;

    dragBar.addEventListener("mousedown", () => {
        isDragging = true;
        document.body.style.cursor = "ew-resize";
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const newWidth = e.clientX;

        // LEFT bar: target width = e.clientX
        if (isLeftBar) {
            if (newWidth > 150 && newWidth < 1000) {
                targetPane.style.flexBasis = `${newWidth}px`;
            }
        }
        // RIGHT bar: target width = viewportWidth - e.clientX
        else {
            const layoutWidth = document.getElementById("layout").clientWidth;
            const rightWidth = layoutWidth - e.clientX;

            if (rightWidth > 150 && rightWidth < 1000) {
                targetPane.style.flexBasis = `${rightWidth}px`;
            }
        }
    });

    window.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = "default";
            savePaneSizes(); // <--- save to localStorage
        }
    });
}

// automatically registered
document.addEventListener("DOMContentLoaded", function () {
    Initialize();
});

// #region progress overlay functions
function showProgressOverlay(msg = "Processing...") {
    document.getElementById("progress-overlay").style.display = "flex";
    document.getElementById("progress-text").textContent = `${msg}`;
}

function updateProgressOverlay(pct, msg = "Processing...") {
    document.getElementById("progress-text").textContent = `${msg} ${pct}%`;
}

function hideProgressOverlay() {
    document.getElementById("progress-overlay").style.display = "none";
}
// #endregion

// #region grid navigation functions
function registerGridNavigationHandlers() {
    const canvas = Globals.outputCanvasDOM;
    const overlay = Globals.overlayCanvasDOM;
    const octx = Globals.overlayCtx;
    const tooltip = Globals.hoverTooltip;

    let hoverX = -1;
    let hoverY = -1;
    let tilePx = -1;
    let selX = -1;
    let selY = -1;

    canvas.addEventListener("mousemove", (e) => {
        if (Globals.isImageEmpty) return;

        const rect = canvas.getBoundingClientRect();

        // mouse in CSS-coordinates
        const mx_css = e.clientX - rect.left;
        const my_css = e.clientY - rect.top;

        // scale factor from CSS → canvas pixels
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // corrected mouse coords in *canvas pixel space*
        const mx = mx_css * scaleX;
        const my = my_css * scaleY;

        const width = Globals.uploadedImageDOM.naturalWidth;
        const pixelSize = 1 + Math.trunc(2000 / width);
        const previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25);
        tilePx = previewCellsDims * pixelSize;

        hoverX = Math.floor(mx / tilePx);
        hoverY = Math.floor(my / tilePx);

        selX = Number(Globals.chunkInputX.value) - 1;
        selY = Number(Globals.chunkInputY.value) - 1;

        if (hoverX !== selX || hoverY !== selY) drawHover(hoverX, hoverY, tilePx);

        // update tooltip text
        tooltip.textContent = `(${hoverX + 1}, ${hoverY + 1})`;
        tooltip.style.display = "block";

        // follow mouse
        // tooltip.style.left = `${mx_css + 10}px`;
        // tooltip.style.top = `${my_css + 10}px`;
        const wbox = Globals.containWrapperDOM.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - wbox.left + 10}px`;
        tooltip.style.top = `${e.clientY - wbox.top + 10}px`;
    });

    canvas.addEventListener("mouseleave", () => {
        // octx.clearRect(0, 0, overlay.width, overlay.height);
        // drawSelected(selX, selY, tilePx);
        drawSelectionFromInputs();
        hoverX = hoverY = -1;
        tooltip.style.display = "none"; // hide tooltip
    });

    canvas.addEventListener("click", () => {
        if (hoverX < 0 || hoverY < 0) return;

        drawSelected(hoverX, hoverY, tilePx);
        Globals.chunkInputX.value = hoverX + 1;
        Globals.chunkInputY.value = hoverY + 1;
        Render.renderPreview();
    });

    function drawHover(x, y, tilePx) {
        octx.clearRect(0, 0, overlay.width, overlay.height);
        octx.fillStyle = "rgba(255,255,255,0.25)";
        octx.fillRect(x * tilePx, y * tilePx, tilePx, tilePx);

        // also draw selected without clearing
        octx.strokeStyle = "rgba(0,255,0,0.8)";
        octx.lineWidth = 10;
        octx.strokeRect(selX * tilePx, selY * tilePx, tilePx, tilePx);
    }

    function drawSelected(x, y, tilePx) {
        octx.clearRect(0, 0, overlay.width, overlay.height);
        octx.strokeStyle = "rgba(0,255,0,0.8)";
        octx.lineWidth = 10;
        octx.strokeRect(x * tilePx, y * tilePx, tilePx, tilePx);
    }
}

function drawSelectionFromInputs() {
    if (Globals.isImageEmpty) return;
    const selX = Number(Globals.chunkInputX.value) - 1;
    const selY = Number(Globals.chunkInputY.value) - 1;

    const width = Globals.uploadedImageDOM.naturalWidth;
    const pixelSize = 1 + Math.trunc(2000 / width);
    const previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25);
    const tilePx = previewCellsDims * pixelSize;

    Globals.overlayCtx.clearRect(0, 0, Globals.overlayCanvasDOM.width, Globals.overlayCanvasDOM.height);

    Globals.overlayCtx.strokeStyle = "rgba(0,255,0,0.8)";
    Globals.overlayCtx.lineWidth = 10;
    Globals.overlayCtx.strokeRect(selX * tilePx, selY * tilePx, tilePx, tilePx);
}

// #endregion

// #region Core Functions

export async function buildPixelCaches(thisCacheBuildEpoch) {
    // if another image was loaded after this build started, this build is stale so just cancel
    if (thisCacheBuildEpoch !== Globals.imageEpoch) return;

    Globals.cacheBuildEpoch = thisCacheBuildEpoch;

    // if build already in progress, don't start another, just assume that any callers will for the build results
    if (Globals.cacheBuildPromise) {
        return Globals.cacheBuildPromise;
    }

    Globals.cacheBuildPromise = (async () => {
        if (Globals.isImageEmpty) {
            console.warn("buildPixelCaches() called before image loaded.");
            return;
        }

        const width = Globals.uploadedImageDOM.naturalWidth;
        const height = Globals.uploadedImageDOM.naturalHeight;
        const totalPixels = width * height;

        Globals.pixelRGB = [];
        Globals.pixelHSL = [];
        Globals.pixelHSV = [];
        Globals.pixelCAM16 = [];

        // Draw image onto hidden canvas
        const hiddenCanvas = document.createElement("canvas");
        hiddenCanvas.width = width;
        hiddenCanvas.height = height;
        const ctx = hiddenCanvas.getContext("2d");
        ctx.drawImage(Globals.uploadedImageDOM, 0, 0);

        const imgData = ctx.getImageData(0, 0, width, height).data;

        // Progress setup
        showProgressOverlay("Loading image... 0%");
        let processed = 0;
        const UPDATE_INTERVAL = 2000; // pixels between UI updates

        let i = 0;
        for (let y = 0; y < height; y++) {
            Globals.pixelRGB[y] = [];
            Globals.pixelHSL[y] = [];
            Globals.pixelHSV[y] = [];
            Globals.pixelCAM16[y] = [];

            for (let x = 0; x < width; x++) {
                const r = imgData[i++];
                const g = imgData[i++];
                const b = imgData[i++];
                i++; // skip alpha

                Globals.pixelRGB[y][x] = [r, g, b];
                Globals.pixelHSL[y][x] = Utils.rgbToHSL(r, g, b);
                Globals.pixelHSV[y][x] = Utils.rgbToHSV(r, g, b);
                Globals.pixelCAM16[y][x] = Utils.rgbToCAM16UCS(r, g, b);

                // Progress update
                processed++;
                if (processed % UPDATE_INTERVAL === 0) {
                    const pct = Math.round((processed / totalPixels) * 100);
                    updateProgressOverlay(pct, "Loading image...");
                    // yield to UI thread
                    await new Promise((r) => setTimeout(r));
                }
            }
        }

        updateProgressOverlay(100, "Image loaded");
        hideProgressOverlay();

        console.log("Globals.pixelRGB / Globals.pixelHSL / Globals.pixelHSV / Globals.pixelCAM16 built.");
        console.log("HSL sanity check:");
        console.log(Globals.colorDB[0].HSL);
        console.log(Utils.rgbToHSL(...Globals.colorDB[0].RGB));
        console.log(Utils.distHSL(Globals.colorDB[0].HSL, Utils.rgbToHSL(...Globals.colorDB[0].RGB)));
        console.log("HSV sanity check:");
        console.log(Globals.colorDB[0].HSV);
        console.log(Utils.rgbToHSV(...Globals.colorDB[0].RGB));
        console.log(Utils.distHSV(Globals.colorDB[0].HSV, Utils.rgbToHSV(...Globals.colorDB[0].RGB)));
        console.log("CAM16 sanity check:");
        console.log(Globals.colorDB[0].CAM16);
        console.log(Utils.rgbToCAM16UCS(...Globals.colorDB[0].RGB));
        console.log(Utils.distCAM16(Globals.colorDB[0].CAM16, Utils.rgbToCAM16UCS(...Globals.colorDB[0].RGB)));

        if (thisCacheBuildEpoch !== Globals.imageEpoch) {
            Globals.pixelRGB = [];
            Globals.pixelHSL = [];
            Globals.pixelHSV = [];
            Globals.pixelCAM16 = [];
            Globals.cacheBuildEpoch = null; // just so we're absolutely sure there can't be an epoch match later
            console.log("Cleared stale cache build");
        }

        // clear promise lock when done building cache
        const result = true;
        Globals.cacheBuildPromise = null;
        return result;
    })();

    return Globals.cacheBuildPromise;
}

export async function processImage() {
    if (Globals.isImageEmpty) {
        console.log("No image to process");
        return;
    }

    // wait for cache rebuild if in process
    if (Globals.cacheBuildPromise) {
        console.log("Pixel cache build in progress - waiting...");
        await Globals.cacheBuildPromise;
    }

    if (Globals.imageEpoch !== Globals.cacheBuildEpoch) {
        console.warn("Stale pixel cache - processing aborted.");
        return;
    }

    Globals.itemCountersDOM.innerHTML = "";

    // Basic image sanity checks
    if (Globals.isImageEmpty) {
        console.error("No image loaded.");
        window.alert("Please load an image first.");
        return;
    }

    const width = Globals.uploadedImageDOM.naturalWidth;
    const height = Globals.uploadedImageDOM.naturalHeight;
    const totalPixels = width * height;

    if (width > Globals.maxDims || height > Globals.maxDims) {
        const yourImageSizeMsg = `your image (${width}x${height}px)`;
        const imageSizeMsg = `max resolution (${Globals.maxDims}x${Globals.maxDims}px)`;
        const proceed = window.confirm(
            `Warning: ${yourImageSizeMsg} exceeds ${imageSizeMsg}.\n\n
            Increase resolution limit to 10000x10000px?\n\n
            (Processing WILL take a long time!)`
        );

        if (!proceed) {
            console.error(`Image too large!\n\n${yourImageSizeMsg}\n\n${imageSizeMsg}`);
            window.alert(`Image too large!\n\n${yourImageSizeMsg}\n\n${imageSizeMsg}`);
            // TODO: clear image
            return;
        } else updateMaxDims(proceed);
    }

    if (width * height > Globals.LARGE_IMAGE_WARNING_THRESHOLD) {
        const proceed = window.confirm(
            `Warning: This image is (${width}x${height}px) and may take a while to process.\n\n
            Reminder: this corresponds to ${width}x${height} in-game tiles.\n\n
            Continue?`
        );
        if (!proceed) {
            // TODO: clear image
            return;
        }
    }

    console.log("Processing currently uploaded image");

    // Item counters
    let counters = {};

    // Grid size for overlay
    let previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25);

    // Output canvas + sizing
    const outputCanvas = Globals.outputCanvasDOM;
    const octx = outputCanvas.getContext("2d");

    const pixelSize = 1 + Math.trunc(2000 / width);
    const canvasPixelWidth = width * pixelSize;
    const canvasPixelHeight = height * pixelSize;

    outputCanvas.width = canvasPixelWidth;
    outputCanvas.height = canvasPixelHeight;

    // overlay canvas + sizing
    const overlayCanvas = Globals.overlayCanvasDOM;
    overlayCanvas.width = outputCanvas.width;
    overlayCanvas.height = outputCanvas.height;

    // Color / item selection filtering
    let colorIdsToExclude = [];
    const itemSelectionCheckboxes = document.querySelectorAll("input[type=checkbox][name=item-selection]");

    itemSelectionCheckboxes.forEach((element) => {
        if (!element.checked) {
            let guid = parseInt(element.getAttribute("guid"));
            colorIdsToExclude.push(guid);
        }
    });

    // Add temporarily suppressed items to exclusion list
    Globals.tempSuppressed.forEach((guid) => {
        if (!colorIdsToExclude.includes(guid)) {
            colorIdsToExclude.push(guid);
        }
    });

    if (colorIdsToExclude.length > 0) {
        console.log(`User-excluded GUIDs: ${colorIdsToExclude.join(", ")}`);
    }

    colorIdsToExclude.sort();
    let colorDBCache = Utils.getExcludedColorDB(Globals.colorDB, colorIdsToExclude);

    // Reset Globals.cachedData for this run
    Globals.cachedData = Array.from({ length: height }, () => new Array(width));
    console.log("========== cleared Globals.cachedData");
    // console.log(Globals.cachedData);

    const colorSpace = Globals.processModeSelectDOM.value;

    // Progress setup
    showProgressOverlay("Processing image... 0%");
    let processed = 0;
    const UPDATE_INTERVAL = 1000; // pixels between UI updates

    //======== FINAL LOOP ======//
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Fast lookup from cached color-space arrays
            const inputColor =
                colorSpace === "RGB"
                    ? Globals.pixelRGB[y][x]
                    : colorSpace === "HSL"
                      ? Globals.pixelHSL[y][x]
                      : colorSpace === "HSV"
                        ? Globals.pixelHSV[y][x]
                        : colorSpace === "CAM16"
                          ? Globals.pixelCAM16[y][x]
                          : Globals.pixelRGB[y][x]; // fallback

            // Find best palette match
            const closestValue = Utils.getDBClosestValue(colorDBCache, inputColor, colorSpace);
            Globals.cachedData[y][x] = closestValue;

            // Always draw using the palette's RGB, regardless of comparison space
            const rgb = closestValue.RGB;
            octx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 255)`;
            octx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);

            // Count items
            const guid = closestValue.GUID;
            counters[guid] = (counters[guid] || 0) + 1;

            // Progress update
            processed++;
            if (processed % UPDATE_INTERVAL === 0) {
                const pct = Math.round((processed / totalPixels) * 100);
                updateProgressOverlay(pct, "Processing image...");
                // yield to UI thread
                await new Promise((r) => setTimeout(r));
            }
        }
    }

    updateProgressOverlay(100, "Image processed");
    hideProgressOverlay();

    Render.renderPreview();

    console.log("counters");
    console.log(counters);

    //===============================================
    // Stable Counter Rendering with Initial Snapshot + Extras
    //===============================================

    Globals.itemCountersDOM.innerHTML = "";

    // Build raw list of {guid, entry, count, suppressed}
    const rawEntries = Globals.colorDB.map((entry, guid) => ({
        guid,
        entry,
        count: counters[guid] || 0,
        suppressed: Globals.tempSuppressed.has(guid)
    }));

    //---------------------------------------------
    // 1. INITIAL ORDER SNAPSHOT (before any suppressions)
    //    Keep only items that had count > 0
    //---------------------------------------------
    if (Globals.tempSuppressed.size === 0) {
        Globals.initialCounterOrder = rawEntries
            .filter((e) => e.count > 0)
            .sort((a, b) => b.count - a.count)
            .map((e) => e.guid);
    }

    //------------------------------------------------------
    // 2. CLASSIFY ITEMS
    //------------------------------------------------------

    const initialSet = new Set(Globals.initialCounterOrder);

    // Always show initial items
    const initialItems = Globals.initialCounterOrder.map((guid) => {
        const match = rawEntries.find((e) => e.guid === guid);
        return match
            ? match
            : {
                  guid,
                  entry: Globals.colorDB[guid],
                  count: 0,
                  suppressed: Globals.tempSuppressed.has(guid)
              };
    });

    // Extras: only those *not* in initialCounterOrder AND count > 0
    const extraItems = rawEntries
        .filter((e) => !initialSet.has(e.guid) && (e.count > 0 || e.suppressed))
        .sort((a, b) => b.count - a.count); // descending count

    // Merge counter entries
    const visibleEntries = [...initialItems, ...extraItems];

    //------------------------------------------------------
    // 4. Render DOM
    //------------------------------------------------------
    Globals.itemCountersDOM.innerHTML = "";
    const frag = document.createDocumentFragment();

    for (const { guid, entry, count, suppressed } of visibleEntries) {
        const container = document.createElement("div");
        container.className = "item-counter";
        container.dataset.guid = guid;

        if (suppressed) container.classList.add("suppressed");

        const preview = Render.createItemPreview(entry, Globals.ICON_DIMS);
        const label = document.createElement("label");
        label.textContent = `${entry.Name} - ${count}`;

        container.appendChild(preview);
        container.appendChild(label);
        frag.appendChild(container);
    }

    Globals.itemCountersDOM.appendChild(frag);
    updateSuppressionUI();

    // draw grid over Mapped Image
    const offset = 0.5;
    if (Globals.showGridLinesDOM.checked) {
        octx.lineWidth = parseInt(Globals.gridThicknessInputDOM.value);
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

    // console.log("Globals.cachedData:");
    // console.log(Globals.cachedData);
    console.log("out canvas pixel dims " + outputCanvas.width / pixelSize + ", " + outputCanvas.height / pixelSize);

    // Show cached-image clear button if cached image exists
    if (localStorage.getItem("cktool-cached-image")) {
        Globals.btnClearImageCacheDOM.style.display = "inline-block";
    }
}
