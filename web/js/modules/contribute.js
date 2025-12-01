import { getColorDB } from "./colordb.js";
import { createItemPreview } from "./render.js";
import { Globals } from "./globals.js";

const tableBody = document.querySelector("#image-table tbody");

async function buildContributionTable() {
    const db = await getColorDB("data/colordb.json");

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

        // Try to load the image; if it fails, use fallback
        await new Promise((resolve) => {
            img.onload = () => {
                img.classList.add("good");
                statusTd.textContent = "OK";
                resolve();
            };
            img.onerror = () => {
                img.onerror = null;
                img.onload = null; // prevent re-trigger from fallback load
                img.src = "images/tiles/image_needed.png";
                img.classList.add("missing");
                statusTd.textContent = "Missing Image";
                resolve();
            };

            img.src = finalSrc;
        });

        imgTd.appendChild(img);
        nameTd.textContent = entry.Name;
        pathTd.textContent = finalSrc;

        tr.appendChild(imgTd);
        tr.appendChild(nameTd);
        tr.appendChild(pathTd);
        tr.appendChild(statusTd);
        tableBody.appendChild(tr);
    }
}

buildContributionTable();
