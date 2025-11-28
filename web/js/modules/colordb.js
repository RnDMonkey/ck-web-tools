import { trimBrackets } from "./utils.js"

export async function getColorDB(path = "data/colordb.json") {
    var data = null
    const response = await fetch(path)
    data = await response.json()

    // binding data
    data.forEach((element) => {
        // Map RGB to int array
        var trimmedRGB = trimBrackets(element["RGB"])
        element["RGB"] = trimmedRGB.split(",").map(Number)
    })

    console.log("Caching Color DB")
    console.log(data)
    return data
}
