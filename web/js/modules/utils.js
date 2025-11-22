// utils.js (ES module)
import * as Globals from "./globals.js";
import Color from "https://colorjs.io/dist/color.js";
// import "https://colorjs.io/src/spaces/cam16.js";
// import Color from "https://colorjs.io/dist/color.js";
// import "https://colorjs.io/dist/cam16.js";  // adds CAM16 spaces to Color

// --- Color conversion helpers -----------------------------

export function rgbToHSL(r, g, b) {
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

export function rgbToHSV(r, g, b) {
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

export function cam16jmh_to_ucs(J, M, h_deg) {
    // 1) Lightness compression
    const Jp = (1.7 * J) / (1 + 0.007 * J);

    // 2) Chroma compression
    const Mprime = Math.log1p(0.0228 * M) / 0.0228;

    // 3) Hue to radians
    const hr = h_deg * Math.PI / 180;

    // 4) a', b'
    const ap = Mprime * Math.cos(hr);
    const bp = Mprime * Math.sin(hr);

    return [Jp, ap, bp];
}

export function rgbToCAM16UCS(r, g, b) {
    if (!Color) {
        console.error("Color.js not loaded");
        return [0,0,0];
    }
    r /= 255; g /= 255; b /= 255;
    // const cam = new Color("srgb", [r, g, b]).to("cam16-ucs");
    const cam = new Color("srgb", [r, g, b]).to("cam16-jmh");
    const [j, m, h] = cam.coords;
    // returns [J', a', b']
    return cam16jmh_to_ucs(j, m, h);
}

// --- Color distance helpers -----------------------------

export function distRGB(a, b) {
    return (
        (a[0] - b[0])**2 +
        (a[1] - b[1])**2 +
        (a[2] - b[2])**2
    );
}

export function distHSL(a, b) {
    // Treat hue as circular:
    let dh = Math.min(Math.abs(a[0] - b[0]), 360 - Math.abs(a[0] - b[0])) / 180;  
    let ds = (a[1] - b[1]) / 100;
    let dl = (a[2] - b[2]) / 100;
    return dh*dh + ds*ds + dl*dl;
}

export function distHSV(a, b) {
    let dh = Math.min(Math.abs(a[0] - b[0]), 360 - Math.abs(a[0] - b[0])) / 180;
    let ds = (a[1] - b[1]) / 100;
    let dv = (a[2] - b[2]) / 100;
    return dh*dh + ds*ds + dv*dv;
}

export function distCAM16(a, b) {
    // CAM16-UCS is already perceptually uniform — straight Euclidean
    return (
        Globals.CAM16_J_WEIGHT * (a[0] - b[0])**2 +
        (a[1] - b[1])**2 +
        (a[2] - b[2])**2
    );
}

// linear euclidean distance comparison. Takes in three values
export function getDBClosestValue(db, inputColor, colorSpace = "RGB") {

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

export function convertToMatrix(array, width) {
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

export function trimBrackets(input) {
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

export function addToColorExclusion(guid) {
    if (colorIdsToExclude.indexOf(guid) < -1){
        colorIdsToExclude.push(guid)
        console.log("adding from exlcusion: " + guid)
    }
}

export function removeColorFromExclusion (guid) {
    if (colorIdsToExclude.indexOf(guid) > -1){
        colorIdsToExclude.splice(guid, -1)
        console.log("removing from exlcusion: " + guid)
    }
}

// NOTE Optimize this, but not sure what would be the best/fastest approach. 
export function getExcludedColorDB(db, exclusions) {
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


