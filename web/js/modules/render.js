import { Globals } from "./globals.js"
import { trimBrackets } from "./utils.js"

// in charge of drawing DOM elements

//TODO remove onclick and instead add event listeners

export function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = text.split(/\s+/)
    let lines = []
    let line = ""

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " "
        const { width } = ctx.measureText(testLine)

        if (width > maxWidth && line !== "") {
            lines.push(line.trim())
            line = words[i] + " "
            if (lines.length >= maxLines) break
        } else {
            line = testLine
        }
    }

    if (lines.length < maxLines && line.trim() !== "") {
        lines.push(line.trim())
    }

    // Center vertically
    const totalHeight = lines.length * lineHeight
    let startY = y - totalHeight / 2 + lineHeight / 2

    lines.forEach((ln, idx) => {
        ctx.fillText(ln, x, startY + idx * lineHeight)
    })
}

// Generates an <img> OR a fallback <canvas> with the Name drawn over the RGB background
export function createItemPreview(entry, size = Globals.ICON_DIMS) {
    const guid = entry.GUID

    // If fallback already cached ? skip drawing, just return an <img> with cached data
    if (Globals.fallbackCache[guid]) {
        const img = document.createElement("img")
        img.src = Globals.fallbackCache[guid]
        img.width = size
        img.height = size
        img.alt = entry.Name
        return img
    }

    // Otherwise create normal image
    const img = document.createElement("img")
    img.src = entry.imageSource
    img.alt = entry.Name
    img.width = size
    img.height = size

    // Hook the onerror to generate fallback
    img.onerror = function () {
        console.warn("Image missing, generating fallback for:", entry.Name)

        // Create fallback canvas
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")

        // Background color from RGB
        const rgb = entry.RGB || [128, 128, 128]
        ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
        ctx.fillRect(0, 0, size, size)

        // Draw the wrapped Name text
        const fontSize = Math.floor(size / 5)
        ctx.font = `bold ${fontSize}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillStyle = "white"

        drawWrappedText(ctx, entry.Name, size / 2, size / 2, size - 4, fontSize + 2, 3)

        // Convert fallback canvas ? PNG
        const dataURL = canvas.toDataURL()

        // 4) Cache it so we never redraw or re-error again
        Globals.fallbackCache[guid] = dataURL

        // 5) Replace image immediately
        img.src = dataURL
    }

    return img
}

export function renderPreview() {
    let chunkX = parseInt(Globals.chunkInputX.value) - 1
    let chunkY = parseInt(Globals.chunkInputY.value) - 1
    // let previewCellsDims = parseInt(gridSizeDOM.value) > 25 ? 25 : parseInt(gridSizeDOM.value)
    let previewCellsDims = Math.min(parseInt(Globals.gridSizeDOM.value), 25)

    // clear preview grid before drawing
    for (let row of Globals.previewCells) {
        for (let cell of row) {
            cell.style.backgroundColor = "transparent"
            cell.src = "images/misc/empty.png"
        }
    }

    for (let y = 0, gy = chunkY * previewCellsDims; y < previewCellsDims; y++, gy++) {
        for (let x = 0, gx = chunkX * previewCellsDims; x < previewCellsDims; x++, gx++) {
            if (gy <= Globals.cachedData.length - 1 && gx <= Globals.cachedData[y].length - 1) {
                let selection = Globals.cachedData[gy][gx]
                Globals.previewCells[y][x].style.backgroundColor = "rgba(" + trimBrackets(selection["RGB"]) + ", 255)"

                // previewCells[y][x].src = selection['imageSource']
                // Use fallback-aware preview generator for each preview cell
                const preview = createItemPreview(selection, Globals.ICON_DIMS) // replace 30px preview grid cells
                Globals.previewCells[y][x].replaceWith(preview)

                // And update local reference since replaceWith() swaps DOM nodes
                Globals.previewCells[y][x] = preview
            } else {
                Globals.previewCells[y][x].style.backgroundColor = "transparent"
                Globals.previewCells[y][x].src = "images/misc/empty.png"
            }
        }
    }
}

export function generateItemSelection(db) {
    const savedStates = JSON.parse(localStorage.getItem("cktool-checkbox-states") || "{}")

    db.forEach((element) => {
        // Instead of a <div>, use a <label> for full block clickability
        let container = document.createElement("label")
        container.className = "item-selection"

        let checkBox = document.createElement("input")
        checkBox.type = "checkbox"
        checkBox.setAttribute("name", "item-selection")
        checkBox.setAttribute("guid", element.GUID)

        checkBox.checked = savedStates[element.GUID] ?? true

        checkBox.addEventListener("change", () => {
            savedStates[element.GUID] = checkBox.checked
            localStorage.setItem("cktool-checkbox-states", JSON.stringify(savedStates))
        })

        let preview = createItemPreview(element, Globals.ICON_DIMS)

        // Order matters: putting checkbox first enables keyboard accessibility
        container.appendChild(checkBox)
        container.appendChild(preview)

        // label text (inside the <label> so it's clickable too)
        let name = document.createElement("span")
        name.textContent = element.Name
        container.appendChild(name)

        Globals.itemSelectionsDOM.appendChild(container)
    })
}

///====  togglers

export function toggleImages() {
    if (Globals.showImageInputs) {
        Globals.imageInputsDOM.setAttribute("style", "display:none !important")
    } else {
        Globals.imageInputsDOM.setAttribute("style", "")
    }
    Globals.showImageInputs = !Globals.showImageInputs
}

export function toggleColorSelection() {
    if (Globals.showSelections) {
        Globals.itemSelectionsDOM.setAttribute("style", "display:none !important")
    } else {
        Globals.itemSelectionsDOM.setAttribute("style", "")
    }
    Globals.showSelections = !Globals.showSelections
}

export function toggleCounterSelection() {
    if (Globals.showCounters) {
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
