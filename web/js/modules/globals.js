// ===============================
// Shared global application state
// ===============================

// use an object because individual variables are not properly mutable while an object instantiation is
export const Globals = {
    colorDB: null,
    paletteEntryByGuid: {},
    paletteNameByGuid: {},
    CAM16_J_WEIGHT: 1,

    cacheBuildPromise: null,
    imageEpoch: 0,
    cacheBuildEpoch: -1,
    initialCounterOrder: [],
    cachedData: [],
    pixelRGB: [],
    pixelHSL: [],
    pixelHSV: [],
    pixelCAM16: [],
    iconCache: {},

    NORMAL_MAXDIMS: 2000,
    LARGE_MAXDIMS: 10000,
    LARGE_IMAGE_WARNING_THRESHOLD: 90000,
    ICON_DIMS: 64, // default value, will mirror CSS var
    previewCells: [],
    maxDims: 2000,

    useFancyIcons: false,
    showImageInputs: true,
    showSelections: true,
    showCounters: true,
    tempSuppressed: new Set(),

    // DOM elements (initialized later)
    chunkInputX: null,
    chunkInputY: null,
    showGridLinesDOM: null,
    gridThicknessInputDOM: null,
    imageUploadDOM: null,
    uploadedImageDOM: null,
    previewTableDOM: null,
    gridSizeDOM: null,
    imageInputsDOM: null,
    itemSelectionsDOM: null,
    itemCountersDOM: null,
    btnClearSuppressedDOM: null,
    processModeSelectDOM: null,
    cam16WeightContainerDOM: null,
    cam16WeightInputDOM: null,
    btnToggleColorsDOM: null,
    btnToggleCountersDOM: null,
    btnToggleImages: null,
    btnProcess: null,
    btnRenderPreview: null,
    allowCachedImageDOM: null,
    btnClearImageCacheDOM: null,
    outputCanvasDOM: null,
    overlayCanvasDOM: null,
    overlayCtx: null,
    hoverTooltip: null,
    iconSizeSelectDOM: null,
    containWrapperDOM: null,
    enableFancyIconsDOM: null,

    // object methods
    get isImageEmpty() {
        const img = Globals.uploadedImageDOM;
        if (!img || !img.src) return true; // not initialized or no src set
        if (img.src.includes("images/misc/empty.png")) return true; // empty placeholder
        return img.naturalWidth * img.naturalHeight === 0;
    }
};

export function initGlobals() {
    Globals.chunkInputX = document.getElementById("chunk-input-x");
    Globals.chunkInputY = document.getElementById("chunk-input-y");
    Globals.showGridLinesDOM = document.getElementById("show-grid-lines");
    Globals.gridThicknessInputDOM = document.getElementById("grid-thickness");
    Globals.imageUploadDOM = document.getElementById("image-upload");
    Globals.uploadedImageDOM = document.getElementById("upload-preview");
    Globals.previewTableDOM = document.getElementById("preview-table");
    Globals.gridSizeDOM = document.getElementById("grid-size");
    Globals.imageInputsDOM = document.getElementById("image-inputs");
    Globals.itemSelectionsDOM = document.getElementById("item-selections");
    Globals.itemCountersDOM = document.getElementById("item-counters");
    Globals.btnClearSuppressedDOM = document.getElementById("btn-clear-suppressed");
    Globals.processModeSelectDOM = document.getElementById("process-options");
    Globals.cam16WeightContainerDOM = document.getElementById("cam16-weight-container");
    Globals.cam16WeightInputDOM = document.getElementById("cam16-weight");
    Globals.btnToggleColorsDOM = document.getElementById("btn-toggle-colors");
    Globals.btnToggleCountersDOM = document.getElementById("btn-toggle-counters");
    Globals.btnToggleImages = document.getElementById("btn-toggle-images");
    Globals.btnProcess = document.getElementById("btn-process");
    Globals.btnRenderPreview = document.getElementById("btn-render-preview");
    Globals.allowCachedImageDOM = document.getElementById("cb-enable-image-cache");
    Globals.btnClearImageCacheDOM = document.getElementById("btn-clear-cache");
    Globals.outputCanvasDOM = document.getElementById("output-canvas");
    Globals.overlayCanvasDOM = document.getElementById("overlay-canvas");
    Globals.overlayCtx = Globals.overlayCanvasDOM.getContext("2d");
    Globals.hoverTooltip = document.getElementById("hover-tooltip");
    Globals.iconSizeSelectDOM = document.getElementById("icon-size-select");
    Globals.containWrapperDOM = document.getElementById("contain-wrapper");
    Globals.enableFancyIconsDOM = document.getElementById("cb-enable-fancy-icons");
}
