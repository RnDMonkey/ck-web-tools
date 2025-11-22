import { rgbToHSL, rgbToHSV, rgbToCAM16UCS, distRGB, distHSL, distHSV, distCAM16, getDBClosestValue, convertToMatrix, trimBrackets, addToColorExclusion, removeColorFromExclusion, getExcludedColorDB } from './utils.js'
import * as Globals from "./globals.js";

// in charge of drawing DOM elements

//TODO remove onclick and instead add event listeners

export function renderPreview() {
    let chunkX = parseInt(Globals.chunkInputX.value) - 1
    let chunkY = parseInt(Globals.chunkInputY.value) - 1
    // let previewCellsDims = parseInt(gridSizeDOM.value) > 25 ? 25 : parseInt(gridSizeDOM.value)
    let previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25);

    // clear preview grid before drawing
    for (let row of Globals.previewCells) {
        for (let cell of row) {
            cell.style.backgroundColor = "transparent";
            cell.src = "images/misc/empty.png";
        }
    }

    for (let y = 0, gy = chunkY * previewCellsDims; y < previewCellsDims; y++, gy++) {
        for (let x = 0, gx = chunkX * previewCellsDims; x < previewCellsDims; x++, gx++) {
            if (gy <= Globals.cachedData.length -1 && gx <= Globals.cachedData[y].length -1) {
                let selection = Globals.cachedData[gy][gx]
                Globals.previewCells[y][x].style.backgroundColor = "rgba(" + trimBrackets(selection['RGB']) + ", 255)"
                
                // previewCells[y][x].src = selection['imageSource']
                // Use fallback-aware preview generator for each preview cell
                const preview = createItemPreview(selection, Globals.IMAGE_DIMS);  // replace 30px preview grid cells
                Globals.previewCells[y][x].replaceWith(preview);
                
                // And update local reference since replaceWith() swaps DOM nodes
                Globals.previewCells[y][x] = preview;

            } else {
                Globals.previewCells[y][x].style.backgroundColor = "transparent"
                Globals.previewCells[y][x].src = "images/misc/empty.png"
            }
        }
    }
}

export function generateItemSelection(db) {

    const savedStates = JSON.parse(localStorage.getItem("cktool-checkbox-states") || "{}");

    db.forEach(element => {

        // Instead of a <div>, use a <label> for full block clickability
        let container = document.createElement("label");
        container.className = "item-selection";

        let checkBox = document.createElement("input");
        checkBox.type = "checkbox";
        checkBox.setAttribute("name", "item-selection");
        checkBox.setAttribute("guid", element.GUID);

        checkBox.checked = savedStates[element.GUID] ?? true;

        checkBox.addEventListener("change", () => {
            savedStates[element.GUID] = checkBox.checked;
            localStorage.setItem("cktool-checkbox-states", JSON.stringify(savedStates));
        
            // Auto-process if an image is loaded
            if (Globals.imgDom.src && Globals.imgDom.naturalWidth > 0) {
                Globals.processImage();
            }
        });

        let preview = createItemPreview(element, Globals.IMAGE_DIMS);

        // Order matters: putting checkbox first enables keyboard accessibility
        container.appendChild(checkBox);
        container.appendChild(preview);

        // label text (inside the <label> so it's clickable too)
        let name = document.createElement("span");
        name.textContent = element.Name;
        container.appendChild(name);

        Globals.itemSelectionsDOM.appendChild(container);
    });
}

///====  togglers

export function toggleImages() {
    if (Globals.showImageInputs){
        Globals.imageInputsDOM.setAttribute("style", "display:none !important")
    } else {
        Globals.imageInputsDOM.setAttribute("style", "")
    }
    Globals.showImageInputs = !Globals.showImageInputs
}

export function toggleColorSelection(){
    if (Globals.showSelections){
        Globals.itemSelectionsDOM.setAttribute("style", "display:none !important")
    } else {
        Globals.itemSelectionsDOM.setAttribute("style", "")
    }
    Globals.showSelections = !Globals.showSelections
}

export function toggleCounterSelection() {
    if (Globals.showCounters){
        Globals.itemCountersDOM.setAttribute("style", "display:none !important")
    } else {
        Globals.itemCountersDOM.setAttribute("style", "")
    }
    Globals.showCounters = !Globals.showCounters
}

// TODO
export function resetPreviews() {
    // if (!previewCells === undefined || !previewCells.length == 0) {
    //     console.log("Resetting previews")
    //     previewCells.forEach(element => {
    //         element.src = "images/misc/empty.png"
    //         element.style.backgroundColor = "transparent"
    //     })
    // }
}
// #endregion

