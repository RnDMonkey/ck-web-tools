// in charge of drawing DOM elements

//TODO remove onclick and instead add event listeners

function renderPreview() {
    let chunkX = parseInt(chunkInputX.value) - 1
    let chunkY = parseInt(chunkInputY.value) - 1
    // let previewCellsDims = parseInt(gridSizeDOM.value) > 25 ? 25 : parseInt(gridSizeDOM.value)
    let previewCellsDims = Math.min(parseInt(gridSizeDOM.value), 25);

    // clear preview grid before drawing
    for (let row of previewCells) {
        for (let cell of row) {
            cell.style.backgroundColor = "transparent";
            cell.src = "images/misc/empty.png";
        }
    }

    for (let y = 0, gy = chunkY * previewCellsDims; y < previewCellsDims; y++, gy++) {
        for (let x = 0, gx = chunkX * previewCellsDims; x < previewCellsDims; x++, gx++) {
            if (gy <= cachedData.length -1 && gx <= cachedData[y].length -1) {
                let selection = cachedData[gy][gx]
                previewCells[y][x].style.backgroundColor = "rgba(" + trimBrackets(selection['RGB']) + ", 255)"
                
                // previewCells[y][x].src = selection['imageSource']
                // Use fallback-aware preview generator for each preview cell
                const preview = createItemPreview(selection, IMAGE_DIMS);  // replace 30px preview grid cells
                previewCells[y][x].replaceWith(preview);
                
                // And update local reference since replaceWith() swaps DOM nodes
                previewCells[y][x] = preview;

            } else {
                previewCells[y][x].style.backgroundColor = "transparent"
                previewCells[y][x].src = "images/misc/empty.png"
            }
        }
    }
}

//
function generateItemSelection(db) {

    // Load saved checkbox states
    const savedStates = JSON.parse(localStorage.getItem("cktool-checkbox-states") || "{}");

    db.forEach(element => {
        let container = document.createElement("div");
        container.className = "item-selection";

        let checkBox = document.createElement("input");
        checkBox.type = "checkbox";
        checkBox.setAttribute("name", "item-selection");
        checkBox.setAttribute("guid", element.GUID);

        // Apply saved checkbox state if present
        checkBox.checked = savedStates[element.GUID] ?? true;

        // Save state whenever any checkbox changes
        checkBox.addEventListener("change", () => {
            savedStates[element.GUID] = checkBox.checked;
            localStorage.setItem("cktool-checkbox-states", JSON.stringify(savedStates));
        });

        // Preview icon
        let preview = createItemPreview(element, IMAGE_DIMS);
        container.appendChild(preview);

        container.appendChild(checkBox);

        let label = document.createElement("label");
        label.textContent = element.Name;
        container.appendChild(label);

        itemSelectionsDOM.appendChild(container);
    });
}


///====  togglers

function toggleImages() {
    if (showImageInputs){
        imageInputsDOM.setAttribute("style", "display:none !important")
    } else {
        imageInputsDOM.setAttribute("style", "")
    }
    showImageInputs = !showImageInputs
}

function toggleColorSelection(){
    if (showSelections){
        itemSelectionsDOM.setAttribute("style", "display:none !important")
    } else {
        itemSelectionsDOM.setAttribute("style", "")
    }
    showSelections = !showSelections
}

function toggleCounterSelection() {
    if (showCounters){
        itemCountersDOM.setAttribute("style", "display:none !important")
    } else {
        itemCountersDOM.setAttribute("style", "")
    }
    showCounters = !showCounters
}

// TODO
function resetPreviews() {
    // if (!previewCells === undefined || !previewCells.length == 0) {
    //     console.log("Resetting previews")
    //     previewCells.forEach(element => {
    //         element.src = "images/misc/empty.png"
    //         element.style.backgroundColor = "transparent"
    //     })
    // }
}
// #endregion

