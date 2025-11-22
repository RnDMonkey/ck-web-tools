// ===============================
// Shared global application state
// ===============================

export const Globals = {
    colorDB: null,
    CAM16_J_WEIGHT: 100,

    cachedData: [],
    pixelRGB: [],
    pixelHSL: [],
    pixelHSV: [],
    pixelCAM16: [],
    fallbackCache: {},

    previewCells: [],
    maxDims: 500,
    IMAGE_DIMS: 64,

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
    btnRenderPreview: null
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
}

/*
// Color DB + settings
export let colorDB = null;
export let CAM16_J_WEIGHT = 1;

// Pixel caches
export let cachedData = [];
export let pixelRGB   = [];
export let pixelHSL   = [];
export let pixelHSV   = [];
export let pixelCAM16 = [];
export const fallbackCache = {};

// Preview grid state
export let previewCells = [];
export const maxDims = 500;
export const IMAGE_DIMS = 64;

// UI toggles
export let showImageInputs = true;
export let showSelections = true;
export let showCounters = true;

// ===============================
// Shared DOM references
// ===============================
export const chunkInputX        = document.getElementById("chunk-input-x");
export const chunkInputY        = document.getElementById("chunk-input-y");
export const showGridLinesDOM   = document.getElementById("show-grid-lines");
export const gridThicknessInput = document.getElementById("grid-thickness");
export const imageUpload        = document.getElementById("image-upload");
export const imgDom             = document.getElementById("upload-preview");
export const previewTable       = document.getElementById("preview-table");
export const uploadedImage      = document.getElementById("upload-preview");
export const gridSizeDOM        = document.getElementById("grid-size");
export const imageInputsDOM     = document.getElementById("image-inputs");
export const itemSelectionsDOM  = document.getElementById("item-selections");
export const itemCountersDOM    = document.getElementById("item-counters");

export const processModeSelect   = document.getElementById("process-options");
export const cam16WeightContainer = document.getElementById("cam16-weight-container");
export const cam16WeightInput    = document.getElementById("cam16-weight");

// Buttons
export const btnToggleColors    = document.getElementById("btn-toggle-colors");
export const btnToggleCounters  = document.getElementById("btn-toggle-counters");
export const btnToggleImages    = document.getElementById("btn-toggle-images");
export const btnProcess         = document.getElementById("btn-process");
export const btnRenderPreview   = document.getElementById("btn-render-preview");

// ===============================
// Mutator helpers for shared values
// ===============================

// Example: if some code needs to replace the pixel caches entirely:
export function setPixelRGB(v)   { pixelRGB = v; }
export function setPixelHSL(v)   { pixelHSL = v; }
export function setPixelHSV(v)   { pixelHSV = v; }
export function setPixelCAM16(v) { pixelCAM16 = v; }

export function setPreviewCells(v) { previewCells = v; }

export function setCachedData(v) { cachedData = v; }

export function setColorDB(v) { colorDB = v; }
*/
