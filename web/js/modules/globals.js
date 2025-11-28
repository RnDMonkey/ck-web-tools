// ===============================
// Shared global application state
// ===============================

// use an object because individual variables are not properly mutable while an object instantiation is
export const Globals = {
    colorDB: null,
    CAM16_J_WEIGHT: 1,

    cacheBuildPromise: null,
    imageEpoch: 0,
    cacheBuildEpoch: -1,
    cachedData: [],
    pixelRGB: [],
    pixelHSL: [],
    pixelHSV: [],
    pixelCAM16: [],
    fallbackCache: {},

    NORMAL_MAXDIMS: 500,
    LARGE_MAXDIMS: 2000,
    LARGE_IMAGE_WARNING_THRESHOLD: 100000,
    ICON_DIMS: 64,
    previewCells: [],
    maxDims: 500,

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
    imgDom: null,
    previewTableDOM: null,
    uploadedImageDOM: null,
    gridSizeDOM: null,
    imageInputsDOM: null,
    itemSelectionsDOM: null,
    itemCountersDOM: null,
    processModeSelectDOM: null,
    cam16WeightContainerDOM: null,
    cam16WeightInputDOM: null,
    btnToggleColorsDOM: null,
    btnToggleCountersDOM: null,
    btnToggleImages: null,
    btnProcess: null,
    btnRenderPreview: null,
    allowLargerImagesDOM: null,
    outputCanvasDOM: null,
    overlayCanvasDOM: null,
    overlayCtx: null,
    hoverTooltip: null
}

export function initGlobals() {
    Globals.chunkInputX = document.getElementById("chunk-input-x")
    Globals.chunkInputY = document.getElementById("chunk-input-y")
    Globals.showGridLinesDOM = document.getElementById("show-grid-lines")
    Globals.gridThicknessInputDOM = document.getElementById("grid-thickness")
    Globals.imageUploadDOM = document.getElementById("image-upload")
    Globals.imgDom = document.getElementById("upload-preview")
    Globals.previewTableDOM = document.getElementById("preview-table")
    Globals.uploadedImageDOM = document.getElementById("upload-preview")
    Globals.gridSizeDOM = document.getElementById("grid-size")
    Globals.imageInputsDOM = document.getElementById("image-inputs")
    Globals.itemSelectionsDOM = document.getElementById("item-selections")
    Globals.itemCountersDOM = document.getElementById("item-counters")
    Globals.processModeSelectDOM = document.getElementById("process-options")
    Globals.cam16WeightContainerDOM = document.getElementById("cam16-weight-container")
    Globals.cam16WeightInputDOM = document.getElementById("cam16-weight")
    Globals.btnToggleColorsDOM = document.getElementById("btn-toggle-colors")
    Globals.btnToggleCountersDOM = document.getElementById("btn-toggle-counters")
    Globals.btnToggleImages = document.getElementById("btn-toggle-images")
    Globals.btnProcess = document.getElementById("btn-process")
    Globals.btnRenderPreview = document.getElementById("btn-render-preview")
    Globals.allowLargerImagesDOM = document.getElementById("allow-larger-images")
    Globals.outputCanvasDOM = document.getElementById("output-canvas")
    Globals.overlayCanvasDOM = document.getElementById("overlay-canvas")
    Globals.overlayCtx = Globals.overlayCanvasDOM.getContext("2d")
    Globals.hoverTooltip = document.getElementById("hover-tooltip")
}
