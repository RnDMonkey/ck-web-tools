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


