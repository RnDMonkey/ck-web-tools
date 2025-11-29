// Originally written by Randy Panopio, resurrected by Ryan Rutledge
import { Globals, initGlobals } from "./modules/globals.js";
import { getColorDB } from "./modules/colordb.js";
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

// #endregion

// #region Initialization and Hooked Event Listeners
export async function Initialize() {
    initGlobals();

    // Build dynamic table BEFORE collecting Globals.previewCells
    // buildPreviewTable(25);

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
        if (Globals.imgDom.src && Globals.imgDom.naturalWidth) {
            processImage();
        }
    });

    Globals.cam16WeightInputDOM.addEventListener("change", () => {
        localStorage.setItem("cktool-cam16-weight", Globals.cam16WeightInputDOM.value);
        Globals.CAM16_J_WEIGHT = parseFloat(Globals.cam16WeightInputDOM.value);
        if (Globals.imgDom.src && Globals.imgDom.naturalWidth) {
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

        if (Globals.imgDom.src && Globals.imgDom.naturalWidth > 0) {
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

        if (Globals.imgDom.src && Globals.imgDom.naturalWidth > 0) {
            processImage(); // auto-process like palette checkbox changes
        }
    });

    // Restore saved allow-larger-images toggle + update maxDims
    const savedAllowLargerImages = localStorage.getItem("cktool-allow-larger-images");
    const allowLarger = savedAllowLargerImages === "true";
    Globals.allowLargerImagesDOM.checked = allowLarger;
    updateMaxDims(allowLarger);

    // Save allow-larger-images toggle + update maxDims
    Globals.allowLargerImagesDOM.addEventListener("change", () => {
        const allowLargerChecked = Globals.allowLargerImagesDOM.checked;
        localStorage.setItem("cktool-allow-larger-images", String(allowLargerChecked));
        updateMaxDims(allowLargerChecked);
    });

    let previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25);

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
    console.log("preview grid cells");
    console.log(Globals.previewCells);

    // #region Button listeners
    Globals.btnToggleColorsDOM.addEventListener("click", Render.toggleColorSelection);
    Globals.btnToggleCountersDOM.addEventListener("click", Render.toggleCounterSelection);
    Globals.btnToggleImages.addEventListener("click", Render.toggleImages);
    Globals.btnProcess.addEventListener("click", processImage);
    Globals.btnRenderPreview.addEventListener("click", Render.renderPreview);
    // #endregion

    Globals.imageUploadDOM.addEventListener("change", function () {
        console.log("Image input change event triggered, opening fs");
        showProgressOverlay("Uploading file...");

        const reader = new FileReader();

        reader.onload = () => {
            Render.resetPreviews();
            Globals.imageEpoch++;
            const thisCacheBuildEpoch = Globals.imageEpoch;

            Globals.imgDom.onload = async () => {
                console.log("Image fully loaded, building caches…");
                await buildPixelCaches(thisCacheBuildEpoch);
                await processImage();
                hideProgressOverlay();
            };

            Globals.imgDom.src = reader.result;
            console.log("Uploaded W: " + Globals.imgDom.naturalWidth + ", H: " + Globals.imgDom.naturalHeight);
        };

        reader.readAsDataURL(this.files[0]);
    });

    document.getElementById("btn-clear-suppressed").addEventListener("click", () => {
        Globals.tempSuppressed.clear();
        updateSuppressionUI();

        // Remove visual cue
        document.querySelectorAll(".item-counter.suppressed").forEach((el) => el.classList.remove("suppressed"));

        if (Globals.imgDom.src && Globals.imgDom.naturalWidth > 0) {
            processImage();
        }
    });
}

function registerPaletteCheckboxHandlers() {
    document.querySelectorAll("input[type=checkbox][name=item-selection]").forEach((cb) => {
        cb.addEventListener("change", () => {
            if (Globals.imgDom.src && Globals.imgDom.naturalWidth > 0) {
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

        if (Globals.imgDom.src && Globals.imgDom.naturalWidth > 0) {
            processImage();
        }
    });
}

function updateSuppressionUI() {
    const count = Globals.tempSuppressed.size;

    const countSpan = document.getElementById("suppression-count");
    const clearBtn = document.getElementById("btn-clear-suppressed");

    countSpan.textContent = count;

    // Disable button if nothing to clear
    clearBtn.disabled = count === 0;
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

    canvas.addEventListener("mousemove", (e) => {
        if (!Globals.imgDom.naturalWidth) return;

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

        const width = Globals.imgDom.naturalWidth;
        const pixelSize = 1 + Math.trunc(2000 / width);
        const previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25);
        const tilePx = previewCellsDims * pixelSize;

        hoverX = Math.floor(mx / tilePx);
        hoverY = Math.floor(my / tilePx);

        drawHover(hoverX, hoverY, tilePx);

        // update tooltip text
        tooltip.textContent = `(${hoverX + 1}, ${hoverY + 1})`;
        tooltip.style.display = "block";

        // follow mouse
        tooltip.style.left = `${mx_css + 10}px`;
        tooltip.style.top = `${my_css - 10}px`;
    });

    canvas.addEventListener("mouseleave", () => {
        octx.clearRect(0, 0, overlay.width, overlay.height);
        hoverX = hoverY = -1;
        tooltip.style.display = "none"; // hide tooltip
    });

    canvas.addEventListener("click", () => {
        if (hoverX < 0 || hoverY < 0) return;

        Globals.chunkInputX.value = hoverX + 1;
        Globals.chunkInputY.value = hoverY + 1;
        Render.renderPreview();
    });

    function drawHover(x, y, tilePx) {
        octx.clearRect(0, 0, overlay.width, overlay.height);
        octx.fillStyle = "rgba(255,255,255,0.15)";
        octx.fillRect(x * tilePx, y * tilePx, tilePx, tilePx);
    }
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
        if (!Globals.uploadedImageDOM.naturalWidth || !Globals.uploadedImageDOM.naturalHeight) {
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
    if (!Globals.imgDom.naturalWidth || !Globals.imgDom.naturalHeight) {
        console.error("No image loaded.");
        window.alert("Please load an image first.");
        return;
    }

    const width = Globals.imgDom.naturalWidth;
    const height = Globals.imgDom.naturalHeight;
    const totalPixels = width * height;

    if (width > Globals.maxDims || height > Globals.maxDims) {
        const yourImageSizeMsg = `\n\nYour image: ${width}x${height}px`;
        const imageSizeMsg = `\n\nMax resolution ${Globals.maxDims}x${Globals.maxDims}px`;
        console.error(`Image too large!${yourImageSizeMsg}${imageSizeMsg}`);
        window.alert(`Image too large!${yourImageSizeMsg}${imageSizeMsg}`);
        return;
    }

    if (width * height > Globals.LARGE_IMAGE_WARNING_THRESHOLD) {
        const proceed = window.confirm(
            `Warning: This image is (${width}×${height}px) and may take a while to process.\n\nContinue?`
        );
        if (!proceed) return;
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

    console.log("Globals.cachedData");
    console.log(Globals.cachedData);
    console.log("out canvas pixel dims " + outputCanvas.width / pixelSize + ", " + outputCanvas.height / pixelSize);
}
