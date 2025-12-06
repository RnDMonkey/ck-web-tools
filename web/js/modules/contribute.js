import { getColorDB, writeGimpPalette } from "./colordb.js";
import { createItemPreview } from "./render.js";
// import { Globals } from "./globals.js";

const tableBody = document.querySelector("#image-table tbody");
let db = null;

async function safeLoadImage(img, finalSrc, statusTd, missingImages) {
    // Check if the file exists before assigning img.src
    const exists = await fetch(finalSrc, { method: "HEAD" })
        .then((r) => r.ok)
        .catch(() => false);

    if (exists) {
        img.src = finalSrc;
        img.classList.add("good");
        statusTd.textContent = "OK";
        return;
    }

    // If missing...
    missingImages.push(finalSrc);
    img.src = "images/tiles/image_needed.png";
    img.classList.add("missing");
    statusTd.textContent = "Missing Image";
}

async function buildContributionTable() {
    if (!db) {
        db = await getColorDB("data/colordb.json");
    }

    const missingImages = [];

    // Preload icon size (use 64px default even if user changed it)
    const ICON_SIZE = 64;

    for (const entry of db) {
        const tr = document.createElement("tr");

        const imgTd = document.createElement("td");
        const nameTd = document.createElement("td");
        const pathTd = document.createElement("td");
        const statusTd = document.createElement("td");

        // Create the preview image
        const img = document.createElement("img");
        img.width = ICON_SIZE;
        img.height = ICON_SIZE;
        img.style.imageRendering = "pixelated";

        let finalSrc = entry["Image Src"];

        // Try to load the image
        await safeLoadImage(img, finalSrc, statusTd, missingImages);

        imgTd.appendChild(img);
        nameTd.textContent = entry.Name;
        pathTd.textContent = finalSrc;

        tr.appendChild(imgTd);
        tr.appendChild(nameTd);
        tr.appendChild(pathTd);
        tr.appendChild(statusTd);
        tableBody.appendChild(tr);
    }

    if (missingImages.length > 0) {
        console.groupCollapsed(`Missing Images (${missingImages.length})`);
        missingImages.forEach((path) => console.log(path));
        console.groupEnd();
    } else {
        console.log("All tile images loaded successfully.");
    }
}

document.getElementById("btn-export-palette").addEventListener("click", async () => {
    if (!db) {
        db = await getColorDB("data/colordb.json");
    }
    console.log("Exporting colorDB: ", db);
    writeGimpPalette(db);
});

buildContributionTable();
