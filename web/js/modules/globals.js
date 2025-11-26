// ===============================
// Shared global application state
// ===============================

// use an object because individual variables are not properly mutable while an object instantiation is
export const Globals = {
    colorDB: null,
    CAM16_J_WEIGHT: 1,

    cachedData: [],
    pixelRGB: [],
    pixelHSL: [],
    pixelHSV: [],
    pixelCAM16: [],
    fallbackCache: {},

    NORMAL_MAXDIMS: 500,
    LARGE_MAXDIMS: 2000,
    ICON_DIMS: 64,
    previewCells: [],
    maxDims: 500,

    showImageInputs: true,
    showSelections: true,
    showCounters: true,

    // DOM elements (initialized later)
    chunkInputX: null,
    chunkInputY: null,
    showGridLinesDOM: null,
    gridThicknessInput: null,
    imageUpload: null,
    imgDom: null,
    previewTable: null,
    uploadedImage: null,
    gridSizeDOM: null,
    imageInputsDOM: null,
    itemSelectionsDOM: null,
    itemCountersDOM: null,
    processModeSelect: null,
    cam16WeightContainer: null,
    cam16WeightInput: null,
    btnToggleColors: null,
    btnToggleCounters: null,
    btnToggleImages: null,
    btnProcess: null,
    btnRenderPreview: null,
    allowLargerImagesDOM: null
};

export function initGlobals() {
    Globals.chunkInputX = document.getElementById("chunk-input-x");
    Globals.chunkInputY = document.getElementById("chunk-input-y");
    Globals.showGridLinesDOM = document.getElementById("show-grid-lines");
    Globals.gridThicknessInput = document.getElementById("grid-thickness");
    Globals.imageUpload = document.getElementById("image-upload");
    Globals.imgDom = document.getElementById("upload-preview");
    Globals.previewTable = document.getElementById("preview-table");
    Globals.uploadedImage = document.getElementById("upload-preview");
    Globals.gridSizeDOM = document.getElementById("grid-size");
    Globals.imageInputsDOM = document.getElementById("image-inputs");
    Globals.itemSelectionsDOM = document.getElementById("item-selections");
    Globals.itemCountersDOM = document.getElementById("item-counters");
    Globals.processModeSelect = document.getElementById("process-options");
    Globals.cam16WeightContainer = document.getElementById("cam16-weight-container");
    Globals.cam16WeightInput = document.getElementById("cam16-weight");
    Globals.btnToggleColors = document.getElementById("btn-toggle-colors");
    Globals.btnToggleCounters = document.getElementById("btn-toggle-counters");
    Globals.btnToggleImages = document.getElementById("btn-toggle-images");
    Globals.btnProcess = document.getElementById("btn-process");
    Globals.btnRenderPreview = document.getElementById("btn-render-preview");
    Globals.allowLargerImagesDOM = document.getElementById("allow-larger-images");
}
