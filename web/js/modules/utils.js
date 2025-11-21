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

// sRGB → XYZ matrix
const M_CAT02 = [
    [0.7328, 0.4296, -0.1624],
    [-0.7036, 1.6975, 0.0061],
    [0.0030, 0.0136, 0.9834]
];

// XYZ → LMS (for CAM02)
const M_HPE = [
    [0.38971, 0.68898, -0.07868],
    [-0.22981, 1.18340, 0.04641],
    [0.00000, 0.00000, 1.00000]
];

function rgbToCAM02(r, g, b) {
    // Normalize RGB
    const sr = r / 255;
    const sg = g / 255;
    const sb = b / 255;

    // sRGB → Linear RGB
    const lin = [sr, sg, sb].map(c =>
        (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
    );

    // Linear RGB → XYZ (D65)
    const XYZ = [
        0.4124564 * lin[0] + 0.3575761 * lin[1] + 0.1804375 * lin[2],
        0.2126729 * lin[0] + 0.7151522 * lin[1] + 0.0721750 * lin[2],
        0.0193339 * lin[0] + 0.1191920 * lin[1] + 0.9503041 * lin[2]
    ];

    // XYZ → LMS (via CAT02)
    const LMS = [
        M_CAT02[0][0] * XYZ[0] + M_CAT02[0][1] * XYZ[1] + M_CAT02[0][2] * XYZ[2],
        M_CAT02[1][0] * XYZ[0] + M_CAT02[1][1] * XYZ[1] + M_CAT02[1][2] * XYZ[2],
        M_CAT02[2][0] * XYZ[0] + M_CAT02[2][1] * XYZ[1] + M_CAT02[2][2] * XYZ[2],
    ];

    // Apply nonlinearity
    const FL = 0.2;
    const LMSp = LMS.map(c => Math.sign(c) * Math.pow(Math.abs(c), 0.42));

    // J'a'b' (UCS)
    const Jp = 2.0 * LMSp[0] + LMSp[1] + 0.05 * LMSp[2];
    const ap = LMSp[0] - LMSp[1];
    const bp = LMSp[1] - LMSp[2];

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

function distCAM02(a, b) {
    // CAM02-UCS is already perceptually uniform — straight Euclidean
    return (
        (a[0] - b[0])**2 +
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
        "CAM02": distCAM02
    };

    const distFunc = distFuncs[colorSpace] || distRGB;

    let closest = { dist: Infinity, val: null };

    for (let i = 0; i < db.length; i++) {
        let dbColor = db[i][colorSpace];

        // direct match shortcut
        if (
            dbColor[0] === inputColor[0] &&
            dbColor[1] === inputColor[1] &&
            dbColor[2] === inputColor[2]
        ) {
            return db[i];
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

/* Approach 1) process the entire color db directly
Pros:
- no need of remapping values, the return function can also just take in which colorspace to use
Cons: 
- Memory constraints? directly manipulating the db here

Approach 2) pass in color dict paired with a guid so we can find it on the db again.
// pros: data readability, you are only using what you need

Cons:
- Need to keep track of parity between the passed in list color vs the original color db (can use guids)
- Takes longer to properly implement lol 
*/
// this is approach 1
function getDBClosestValue(db, inputColor, colorSpace = "RGB"){
    var closest = {}
    var dist
    for (var i = 0; i < db.length; i++) {
        var dbColor = db[i][colorSpace]// get val from json/db
        if (dbColor[0] == inputColor[0] && dbColor[1] == inputColor[1] && dbColor[2] == inputColor[2]) { //its the exact same rgb value as a color, just return that
            return db[i]
        }
 
        dist = Math.pow(dbColor[0] - inputColor[0], 2)
        dist += Math.pow(dbColor[1] - inputColor[1], 2)
        dist += Math.pow(dbColor[2] - inputColor[2], 2)
        // dist = Math.sqrt(dist) // can skip this and use approximate relative distance

        if (!closest.dist || closest.dist > dist) {
            closest.dist = dist
            closest.val = db[i]
        }
    }
    return closest.val
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


