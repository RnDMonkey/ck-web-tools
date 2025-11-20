// in charge of drawing DOM elements

//TODO remove onclick and instead add event listeners
function renderPreview() {
    let chunkX = parseInt(chunkInputX.value) - 1
    let chunkY = parseInt(chunkInputY.value) - 1
    // let previewCellsDims = parseInt(gridSizeDOM.value) > 25 ? 25 : parseInt(gridSizeDOM.value)
    let previewCellsDims = Math.min(parseInt(gridSizeDOM.value), 25);

    for (let y = 0, gy = chunkY * previewCellsDims; y < previewCellsDims; y++, gy++) {
        for (let x = 0, gx = chunkX * previewCellsDims; x < previewCellsDims; x++, gx++) {
            if (gy <= cachedData.length -1 && gx <= cachedData[y].length -1) {
                let selection = cachedData[gy][gx]
                previewCells[y][x].style.backgroundColor = "rgba(" + trimBrackets(selection['RGB']) + ", 255)"
                
                // previewCells[y][x].src = selection['imageSource']
                // Use fallback-aware preview generator for each preview cell
                const preview = createItemPreview(selection, 64);  // replace 30px preview grid cells
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
function generateItemSelection (db) {
    db.forEach(element => {
        let container = document.createElement("div")
        container.setAttribute("class", "item-selection")
        let checkBox = document.createElement("input")
        let label = document.createElement("label")
        checkBox.type = "checkbox"
        checkBox.checked = true
        checkBox.setAttribute("name", "item-selection")
        checkBox.setAttribute("guid", element["GUID"])

        // let image = document.createElement("img")
        // image.src = element["imageSource"]
        // image.style.backgroundColor = "rgba(" + trimBrackets(element['RGB']) + ", 255)"

        // container.appendChild(image)

        let preview = createItemPreview(element, 32);  // 32px icon size
        container.appendChild(preview);

        container.appendChild(checkBox)
        container.appendChild(label)
        itemSelectionsDOM.appendChild(container)

        label.appendChild(document.createTextNode(element["Name"]))
    })
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

