// --- Color conversion helpers -----------------------------

function rgbToHSL(r, g, b) {
    r /= 255; g /= 255; b /= 255;

    const max = Math.max(r, g, b), 
          min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // gray
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
            case g: h = ((b - r) / d + 2); break;
            case b: h = ((r - g) / d + 4); break;
        }
        h *= 60;
    }

    return [h, s * 100, l * 100];
}

function rgbToHSV(r, g, b) {
    r /= 255; g /= 255; b /= 255;

    const max = Math.max(r, g, b),
          min = Math.min(r, g, b);
    const d = max - min;

    let h, s = (max === 0 ? 0 : d / max), v = max;

    if (d === 0) {
        h = 0; // undefined hue for grayscale
    } else {
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
            case g: h = ((b - r) / d + 2); break;
            case b: h = ((r - g) / d + 4); break;
        }
        h *= 60;
    }

    return [h, s * 100, v * 100];
}

// --- CIECAM16-UCS conversion (J' a' b') ---
function rgbToCAM16(r, g, b) {

    // ===== 1) sRGB to linear RGB =====
    function lin(c) {
        c = c / 255;
        return (c <= 0.04045) ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    const R = lin(r), G = lin(g), B = lin(b);

    // ===== 2) linear RGB to XYZ (D65) =====
    const X = 0.4124564 * R + 0.3575761 * G + 0.1804375 * B;
    const Y = 0.2126729 * R + 0.7151522 * G + 0.0721750 * B;
    const Z = 0.0193339 * R + 0.1191920 * G + 0.9503041 * B;

    // ===== 3) XYZ to LMS (CAT16) =====
    // From Li et al. 2017, CAM16 specification
    const L =  0.401288 * X + 0.650173 * Y - 0.051461 * Z;
    const M = -0.250268 * X + 1.204414 * Y + 0.045854 * Z;
    const S = -0.002079 * X + 0.048952 * Y + 0.953127 * Z;

    // ===== 4) nonlinearity =====
    function f(t) {
        return Math.sign(t) * Math.pow(Math.abs(t), 0.42);
    }
    const Lp = f(L);
    const Mp = f(M);
    const Sp = f(S);

    // ===== 5) Compute a, b, J (CAM16 correlates) =====
    const a  = (Lp - Mp);
    const b_ = (Mp - Sp);
    const J  = (2 * Lp + Mp + 0.05 * Sp);

    // ===== 6) CAM16-UCS transform (Li et al. 2017) =====
    // These constants are the official CAM16-UCS mapping:
    const c1 = 0.007;
    const c2 = 0.0228;

    const Jp = (1 + 100 * c1) * J / (1 + c1 * J);
    const ap = a / c2;
    const bp = b_ / c2;

    return [Jp, ap, bp];
}

// --- Color distance helpers -----------------------------

function distRGB(a, b) {
    return (
        (a[0] - b[0])**2 +
        (a[1] - b[1])**2 +
        (a[2] - b[2])**2
    );
}

function distHSL(a, b) {
    // Treat hue as circular:
    let dh = Math.min(Math.abs(a[0] - b[0]), 360 - Math.abs(a[0] - b[0])) / 180;  
    let ds = (a[1] - b[1]) / 100;
    let dl = (a[2] - b[2]) / 100;
    return dh*dh + ds*ds + dl*dl;
}

function distHSV(a, b) {
    let dh = Math.min(Math.abs(a[0] - b[0]), 360 - Math.abs(a[0] - b[0])) / 180;
    let ds = (a[1] - b[1]) / 100;
    let dv = (a[2] - b[2]) / 100;
    return dh*dh + ds*ds + dv*dv;
}

function distCAM16(a, b) {
    // CAM16-UCS is already perceptually uniform — straight Euclidean
    return (
        CAM16_J_WEIGHT * (a[0] - b[0])**2 +
        (a[1] - b[1])**2 +
        (a[2] - b[2])**2
    );
}

// linear euclidean distance comparison. Takes in three values
function getDBClosestValue(db, inputColor, colorSpace = "RGB") {

    const distFuncs = {
        "RGB": distRGB,
        "HSL": distHSL,
        "HSV": distHSV,
        "CAM16": distCAM16
    };

    const distFunc = distFuncs[colorSpace] || distRGB;

    let closest = { dist: Infinity, val: null };

    for (let i = 0; i < db.length; i++) {
        let dbColor = db[i][colorSpace];

        if (
            dbColor[0] === inputColor[0] &&
            dbColor[1] === inputColor[1] &&
            dbColor[2] === inputColor[2]
        ) {
            return db[i]; //exact match shortcut
        }

        let d = distFunc(dbColor, inputColor);

        if (d < closest.dist) {
            closest.dist = d;
            closest.val = db[i];
        }
    }

    return closest.val;
}

function convertToMatrix(array, width) {
    var matrix = [], i, k;
    for (i = 0, k = -1; i < array.length; i++) {
        if (i % width === 0) {
            k++;
            matrix[k] = [];
        }
        matrix[k].push(array[i]);
    }
    return matrix;
}

function trimBrackets(input) {
    let str = String(input)
    if (str.startsWith("[") || str.startsWith("(")) {
        str = str.substring(1)
    }
    if (str.endsWith("]") || str.endsWith(")")) {
        str = str.slice(0, -1)
    }
    return str
}

// function 

function addToColorExclusion(guid) {
    if (colorIdsToExclude.indexOf(guid) < -1){
        colorIdsToExclude.push(guid)
        console.log("adding from exlcusion: " + guid)
    }
}

function removeColorFromExclusion (guid) {
    if (colorIdsToExclude.indexOf(guid) > -1){
        colorIdsToExclude.splice(guid, -1)
        console.log("removing from exlcusion: " + guid)
    }
}

// NOTE Optimize this, but not sure what would be the best/fastest approach. 
function getExcludedColorDB(db, exclusions) {
    let result = JSON.parse(JSON.stringify(db)) // GOTA DEEPCLONE 
    for (let i = result.length -1; i >= 0; i--) {
        let guid = result[i]["GUID"]
        if (exclusions.includes(guid)){
            result.splice(i, 1)
        }
    }
    console.log("spliced result")
    console.log(result)
    return result
}


