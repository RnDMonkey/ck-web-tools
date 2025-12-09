import { trimBrackets } from "./utils.js";
import { Globals } from "./globals.js";

function validateColorDB(db) {
    const seen = new Set();

    for (const entry of db) {
        if (typeof entry.guid !== "number") {
            console.error("Invalid or missing GUID:", entry);
            continue;
        }
        if (seen.has(entry.guid)) {
            console.error("Duplicate GUID:", entry.guid);
        }
        seen.add(entry.guid);
    }

    console.log("Palette validation complete.");
}

export async function getColorDB(path = "data/colordb.json") {
    let data = null;
    const response = await fetch(path);
    data = await response.json();

    // Map RGB to [r,g,b] array
    data.forEach((element) => {
        var trimmedRGB = trimBrackets(element.RGB);
        element.RGB = trimmedRGB.split(",").map(Number);
    });

    console.log("Loaded palette entries:", data);
    validateColorDB(data);

    for (const entry of data) {
        const guid = entry.guid;

        if (guid == null) {
            console.error("Entry missing GUID:", entry);
            continue;
        } else {
            Globals.paletteEntryByGuid[guid] = entry;
            Globals.paletteNameByGuid[guid] = entry.Name;
        }
    }

    if (data) {
        Object.freeze(Globals.paletteEntryByGuid);
        Object.freeze(Globals.paletteNameByGuid);
    }

    // console.log("Globals.paletteEntryByGuid:", Globals.paletteEntryByGuid);
    // console.log("Globals.paletteNameByGuid", Globals.paletteNameByGuid);

    return data;
}

export function writeGimpPalette(entries, options = {}) {
    const { paletteName = "Core Keeper Tiles", columns = 16, sortFn = null } = options;

    let lines = [];
    lines.push("GIMP Palette");
    lines.push(`Name: ${paletteName}`);
    lines.push(`Columns: ${columns}`);
    lines.push("#");

    // Apply sort only to palette export, not the original list
    const iterable = sortFn ? [...entries].sort(sortFn) : entries;

    for (const entry of iterable) {
        const rgb = entry.RGB;
        const name = entry.Name || "";
        if (!rgb) continue;

        const [r, g, b] = rgb;

        // right-aligned 3-width integers
        const line = `${r.toString().padStart(3)} ${g.toString().padStart(3)} ${b.toString().padStart(3)}\t${name}`;

        lines.push(line);
    }

    // Turn into blob for download
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });

    const url = URL.createObjectURL(blob);

    // Create and auto-click a hidden download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `${paletteName}.gpl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up URL object
    URL.revokeObjectURL(url);
}
