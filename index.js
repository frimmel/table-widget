/**
 * @file Sets up utilities for parsing the CSV and building the table from it.
 */
(function() {
  "use strict";

  (function main() {
    updateColorsFromURLParams();
    bindListeners();
  }());

  /**
   * Binds needed event listeners.
   */
  function bindListeners() {
    document.querySelector("#file").addEventListener("change", handleFileUpload);
    document.querySelector("#tabs").addEventListener("click", handleTabClick);
    document.addEventListener("input", handleColorInput);
    document.querySelector("#legend-reset").addEventListener("click", resetColorsToDefault);
    document.querySelector("#icon-toggle").addEventListener("click", toggleIndicatorType);
    dropHandlers();
    document.querySelector("textarea").addEventListener("click", copyToClipboard);
  }

  /**
   * Handles when a user clicks the page to upload a file.
   * @param {Event} e - The change event
   */
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
      processData(file);
    }
  }

  /**
   * Handles drag and drop events
   */
  function dropHandlers() {
    const dropZone = document.querySelector("#file-upload");
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("file-accent");
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("file-accent");
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          processData(file);
        }
      }
    });
  }

  /**
   * Reads the contents of the file and triggers the widget being built.
   * @param {*} file - The uploaded file
   */
  function processData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      buildWidget(e.target.result);
    };
    reader.readAsText(file);
  }

  /**
   * Builds and displays the table widget
   * @param {string} csvString - Contents of the uploaded file.
   */
  function buildWidget(csvString) {
    const data = parseCSV(csvString);
    if (data === null) {
      console.error("Unable to parse data", csvString);
      return;
    }
    document.querySelector("#fileupload").classList.add("display-none")
    document.querySelector("#tablewidget").classList.remove("display-none");
    const table = generateTable(reprocessDefaultData(data), getRenderKeys());
    document.querySelector("#table-default").append(table);
    const mergedTable = generateTable(reprocessMergedData(data), getMergedRenderKeys());
    document.querySelector("#table-merged .c--nasa-indicators-table").append(mergedTable);
    document.querySelector("textarea").textContent = document.querySelector("textarea").textContent.replace(
      "{{ TEMPLATE }}",
      document.querySelector("#table-merged .c--nasa-indicators-table").outerHTML
    );
    updateColors();
    updateTextColors();
  }

  /**
   * Parses a CSV string to JSON.
   * @param {string} data - String of the CSV
   * @param {string} separator - Separator of CSV file if not the default of ","
   * @return {Array|null} - Array of objects keyed by first row of data or null if not valid.
   * @todo Handle the separator being a substring of a value.
   * @todo Handle rows being inconsistent lengths
   * @todo Handle other malformed data
   */
  function parseCSV(data, separator = ",") {
    const lines = data.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line !== "");

    if (lines.length === 0 || lines.length === 1) {
      return null;
    }

    const headers = parseCSVLine(lines.shift(), separator);
    const result = [];
    let i, j, l, ll, line, parsedData;
    for (i = 0, l = lines.length; i < l; i++) {
      line = parseCSVLine(lines[i], separator);
      parsedData = {};
      for (j = 0, ll = line.length; j < ll; j++) {
        parsedData[headers[j]] = parseMarkdownLinks(line[j]);
      }
      result.push(parsedData);
    }
    return result;
  }

  /**
   * Parses a single line of a CSV file, handling inner commas.
   * @param {string} line - A single line of a CSV file.
   * @param {string} separator - Separator of CSV file if not the default of ","
   * @return {[]} - Array of strings parsed from the CSV line.
   */
  function parseCSVLine(line, separator = ",") {
    const entries = [];
    let entry = '';
    let inQuote = false;
    let char, i, l;

    for (i = 0, l = line.length; i < l; i++) {
      char = line[i];

      if (char === '"') {
        inQuote = !inQuote;
        // Handle escaped quotes (e.g., "" inside a quoted field)
        if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
          entry += '"';
          i++; // Skip the second quote
        }
      } else if (char === separator && !inQuote) {
        entries.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    entries.push(entry.trim()); // Add the last field
    return entries;
  }

  /**
   * Simple replacement of markdown links with HTML links. Doesn't do real validation or cleaning input. Doesn't handle
   * square brackets in the text of a link.
   * @param {string} entry - Single value in the CSV file
   * @return {string} - entry with all markdown links converted to their HTML equivalents.
   */
  function parseMarkdownLinks(entry) {
    let matches = entry.match(/\[[^\]]*\]\([^\(]*\)/g);
    if (!matches) {
      return entry;
    }
    let i, l, url, text;
    for (i = 0, l = matches.length; i < l; i++) {
      url = matches[i].match(/\([^\(]*\)/)[0].replace(/\(|\)/g, "");
      text = matches[i].match(/\[[^\]]*\]/)[0].replace(/\[|\]/g, "");
      entry = entry.replace(matches[i], `<a href="${url}">${text}</a>`)
    }
    return entry;
  }

  /**
   * Adds the timescale if present to the Indicator title
   * @param {*} data 
   * @returns 
   */
  function reprocessDefaultData(data) {
    const newData = [];
    let i, l, item;
    for (i = 0, l = data.length; i < l; i++) {
      item = { ...data[i] };
      newData.push(item);
      if (item["Most Relevant Timescales"] === "N/A" || item["Most Relevant Timescales"] === "TBD") {
        continue;
      }
      item.Indicator = `${item["Most Relevant Timescales"]} ${item.Indicator}`;
    }
    return newData;
  }

  /**
   * If we end up utilizing merged data rewrite this. At present for simplicities sake of the update logic it creates a
   * giant array of data which merges together rows that have the same Dataset Group key, then renders it all.
   * @param {[]} data 
   * @returns 
   */
  function reprocessMergedData(data) {
    const uniqueData = {};
    const [regions, seasons] = [getRegions(), getSeasons()];
    let i, j, l, ll, key, newSubset;
    for (i = 0, l = regions.length; i < l; i++) {
      for (j = 0, ll = seasons.length; j < ll; j++) {
        key = `${regions[i]} - ${seasons[j]}`;
        newSubset = getMergedSeasonalData(data, key);
        newSubset.forEach((item) => {
          if (!uniqueData[item.Dataset]) {
            uniqueData[item.Dataset] = item;
          } else {
            uniqueData[item.Dataset][key] = item[key];
          }
        })
      }
    }
    const newData = Object.values(uniqueData);
    newData.sort(function (a, b) {
      return parseFloat(b[`${regions[0]} - ${seasons[0]}`]) - parseFloat(a[`${regions[0]} - ${seasons[0]}`]);
    });
    return newData;
  }

  /**
   * 
   * @param {*} data 
   * @param {*} key 
   * @returns 
   */
  function getMergedSeasonalData(data, key) {
    const newDataGrouped = {};
    data.sort(function (a, b) {
      return parseFloat(b[key]) - parseFloat(a[key]);
    });
    const clonedData = JSON.parse(JSON.stringify(data.slice(0, 15)));
    clonedData.sort(function (a, b) {
      if (a["Most Relevant Timescales"] === "N/A" && b["Most Relevant Timescales"] !== "N/A") {
        return -1;
      }
      if (a["Most Relevant Timescales"] !== "N/A" && b["Most Relevant Timescales"]=== "N/A") {
        return 1;
      }
      if (a["Most Relevant Timescales"] === "N/A" && b["Most Relevant Timescales"] === "N/A") {
        return 0;
      }
      return parseInt(a["Most Relevant Timescales"]) - parseInt(b["Most Relevant Timescales"]);
    });
    resetOtherKeys(clonedData, key);
    let i, l;
    for (i = 0, l = clonedData.length; i < l; i++) {
      if (!newDataGrouped[clonedData[i]["Dataset Group"]]) {
        newDataGrouped[clonedData[i]["Dataset Group"]] = [];
      }
      newDataGrouped[clonedData[i]["Dataset Group"]].push(clonedData[i]);
    }
    const newData = Object.values(newDataGrouped).map(mergeUnprocessedData.bind(key));
    for (i = 0, l = newData.length; i < l; i++) {
      if (newData[i]["Most Relevant Timescales"] && newData[i]["Most Relevant Timescales"] !== "N/A") {
        newData[i]["Indicator"] = `${newData[i]["Most Relevant Timescales"]} ${newData[i]["Indicator"]}`;
      }
    }
    return newData;
  }

  /**
   * Reset all other region / season pairs to 0 so they won't be shown in the grouped table.
   * @param {*} data 
   * @param {*} currentKey 
   */
  function resetOtherKeys(data, currentKey) {
    const [regions, seasons] = [getRegions(), getSeasons()];
    let i, j, k, l, ll, lll, resetKey;
    for (i = 0, l = regions.length; i < l; i++) {
      for (j = 0, ll = seasons.length; j < ll; j++) {
        resetKey = `${regions[i]} - ${seasons[j]}`;
        for (k = 0, lll = data.length; k < lll; k++) {
          if (currentKey !== resetKey) {
            data[k][resetKey] = 0;
          }
        }
      }
    }
  }

  /**
   * Merges together the array of objects of datasets into single grouped dataset.
   * @param {[{}]} items - Multiple datasets
   * @return {} - Single grouped dataset. Uses the Dataset key so that other region.seasons with the same combination
   *   will be easily found and merged together.
   */
  function mergeUnprocessedData(items) {
    const regionSeasonKey = this;
    const idKey = "Dataset";
    const newObj = {};
    items.forEach((item) => {
      Object.entries(item).forEach(([key, value]) => {
        if (!newObj[key]) {
          newObj[key] = [];
        }
        newObj[key].push(value);
      });
    });
    Object.entries(newObj).forEach(([key, value]) => {
      value = [...new Set(value)];
      if (key === idKey) {
        newObj[key] = value.sort().join(",");
      } else if (key === regionSeasonKey) {
        newObj[key] = Math.max(...value);
      } else if (key === "Additional Datasets") {
        newObj[key] = mergeAdditionalDatasets(value);
      } else {
        newObj[key] = value.join(", ")
      }
    });
    return newObj;
  }

  function mergeAdditionalDatasets(arr) {
    const e = document.createElement("div");
    e.innerHTML = arr.join("");
    const a = e.querySelectorAll("a");
    let i, j, link;
    for (i = a.length - 1; i >= 0; i--) {
      link = a[i].getAttribute("href");
      for (j = 0; j < i; j++) {
        if (link === a[j].getAttribute("href")) {
          a[i].remove();
          break;
        }
      }
    }
    const p = e.querySelectorAll("p");
    for (i = p.length - 1; i >= 0; i--) {
      if (!p[i].querySelector("a")) {
        p[i].remove();
      }
    }
    return e.innerHTML;
  }

  /**
   * Creates the complete HTML for the end table widget, with all children.
   * @param {array} data - Array of objects of parsed CSV data. Result of parseCSV(getData())
   * @return {HTMLTableElement} - The complete HTML table.
   */
  function generateTable(data, renderKeys) {
    const [regions, seasons] = [getRegions(), getSeasons()];
    const table = createElement("table", "usa-table usa-table--stacked usa-table--sticky-header");
    table.append(createHeader(renderKeys), createBody(data, renderKeys, regions, seasons));
    return table;
  }

  /**
   * Creates the complete thead of the table, with all children.
   * @param {array} renderKeys - Keys which are rendered in the table and used as headers. Result of getRenderKeys
   * @return {HTMLTableSectionElement} - The thead element.
   */
  function createHeader(renderKeys) {
    const thead = createElement("thead");
    const tr = createElement("tr");
    let th, i, l;
    for (i = 0, l = renderKeys.length; i < l; i++) {
      th = createElement("th");
      th.textContent = renderKeys[i];
      th.setAttribute("scope", "col");
      tr.append(th);
    }
    thead.append(tr);
    return thead;
  }

  /**
   * Creates the complete HTML for the body of the table.
   * @param {[]} data - Array of objects of parsed CSV data. Result of parseCSV(getData())
   * @param {[]} renderKeys - Keys which are rendered in the table and used as headers. Result of getRenderKeys
   * @param {[]} regions - Regions used for the selection of content. Result of getRegions.
   * @param {[]} seasons - Seasons used for the selection of content. Result of getSeasons.
   * @return {HTMLTableSectionElement} - The complete tbody element.
   */
  function createBody(data, renderKeys, regions, seasons) {
    const key = `${regions[0]} - ${seasons[0]}`;
    data.sort(function (a, b) {
      if (a[key] === undefined || b[key] === undefined) {
        return 0;
      }
      return b[key] - a[key];
    });
    const tbody = createElement("tbody");
    let tr, td, i, j, l, ll;
    for (i = 0, l = data.length; i < l; i++) {
      tr = createElement("tr", (i > 14 || parseFloat(data[i][key]) === 0) ? "display-none" : "");
      addFIData(tr, data[i], regions, seasons);
      tr.setAttribute("data-indicator", data[i]["Indicator Type"]);
      for (j = 0, ll = renderKeys.length; j < ll; j++) {
        if (j === 0) {
          td = createElement("th");
          td.setAttribute("scope", "row");
        } else {
          td = createElement("td");
        }
        td.innerHTML = data[i][renderKeys[j]];
        td.setAttribute("data-label", renderKeys[j]);
        tr.append(td);
      }
      tbody.append(tr);
    }
    return tbody;
  }

  /**
   * Binds the FI data values to data attributes to allow for later sorting / filtering.
   * @param {HTMLTableRowElement} tr - A tr element
   * @param {{}} dataRow - The row of data for the tr element.
   * @param {[]} regions - Regions used for the selection of content. Result of getRegions.
   * @param {[]} seasons - Seasons used for the selection of content. Result of getSeasons.
   */
  function addFIData(tr, dataRow, regions, seasons) {
    let key, dataAttrKey, i, j, l, ll;
    for (i = 0, l = regions.length; i < l; i++) {
      for (j = 0, ll = seasons.length; j < ll; j++) {
        key = `${regions[i]} - ${seasons[j]}`;
        dataAttrKey = `${regions[i]}-${seasons[j]}`.toLowerCase().replace(" ", "");
        tr.setAttribute(`data-${dataAttrKey}`, dataRow[key]);
      }
    }
  }

  /**
   * Utility to create an element with classes
   * @param {string} tag - Tag name
   * @param {string} classes - Optional space separated list of classes.
   * @return {Element} - A DOM Element.
   * @todo add error handling.
   */
  function createElement(tag, classes = "") {
    const element = document.createElement(tag);
    if (classes) {
      element.className = classes;
    }
    return element;
  }

  /**
   * Gets the keys of data which is rendered in the table.
   * @return {array} - Keys which are rendered in the table and used as headers.
   * @todo Determine these dynamically if needed.
   */
  function getRenderKeys() {
    return ["Indicator", "What Is This, and How Do I Use It?", "Datasets In Study", "Additional Datasets", "Indicator Type"];
  }

    /**
   * Gets the keys of data which is rendered in the merged table.
   * @return {array} - Keys which are rendered in the table and used as headers.
   * @todo Determine these dynamically if needed.
   */
    function getMergedRenderKeys() {
      return ["Indicator", "What Is This, and How Do I Use It?", "Datasets In Study", "Additional Datasets"];
    }

  /**
   * Gets the names of the regions.
   * @return {array} - Parts of the keys which grab the FI data for sorting.
   * @todo Determine these dynamically if needed.
   */
  function getRegions() {
    return ["High Plains", "Midwest", "Northeast", "South", "Southeast", "West"];
  }

  /**
   * Gets the names of the regions.
   * @return {array} - Parts of the keys which grab the FI data for sorting.
   * @todo Determine these dynamically if needed.
   */
  function getSeasons() {
    return ["All", "Spring", "Summer", "Fall", "Winter"];
  }

  /**
   * Toggles the table displayed and the active tab classes.
   * @param {Event} e - the click event
   */
  function handleTabClick(e) {
    if (e.target.classList.contains("tab") === false || e.target.classList.contains("active")) {
      return;
    }
    const tables = document.querySelectorAll(".table");
    const tabs = document.querySelectorAll(".tab.active");
    const targetId = e.target.getAttribute("for");
    let i, l;
    for (i = 0, l = tables.length; i < l; i++) {
      if (tables[i].id === targetId) {
        tables[i].classList.remove("display-none");
      } else {
        tables[i].classList.add("display-none");
      }
    }
    for (i = 0, l = tabs.length; i < l; i++) {
      tabs[i].classList.remove("active");
    }
    e.target.classList.add("active");
  }

  /**
   * Handles an input element in the legend being updated to update all colors.
   * @param {*} e - Input event
   */
  function handleColorInput(e) {
    if (!e.target.closest(".legend-item")) {
      return;
    }
    updateColors();
    updateTextColors();
    updateColorURLParams();
  }

  /**
   * Updates the styles of all legend cells to the new colors.
   */
  function updateColors() {
    const elems = document.querySelectorAll(".legend-item input[type='text']");
    const rows = document.querySelectorAll("tr");
    let i, j, k, l, ll, lll, color, cells;
    for (i = 0, l = elems.length; i < l; i++) {
      color = elems[i].value;
      if ((color.length !== 4 && color.length !== 7) || color.charAt(0) !== "#") {
        continue;
      }
      elems[i].closest(".legend-item").querySelector(".legend-icon").style.backgroundColor = color;
      for (j = 0, ll = rows.length; j < ll; j++) {
        if (rows[j].getAttribute("data-indicator") !== elems[i].getAttribute("data-for")) {
          continue;
        }
        cells = rows[j].querySelectorAll("th, td");
        for (k = 0, lll = cells.length; k < lll; k++) {
          cells[k].style.backgroundColor = color;
        }
      }
    }
  }

  /**
   * Updates the styles of all legend cells to the new colors.
   */
  function updateTextColors() {
    const elems = document.querySelectorAll(".legend-item input[type='checkbox']");
    let i, j, l, ll, checked, rows;
    for (i = 0, l = elems.length; i < l; i++) {
      checked = elems[i].checked;
      rows = document.querySelectorAll(`tr[data-indicator='${elems[i].getAttribute("data-for")}']`);
      for (j = 0, ll = rows.length; j < ll; j++) {
        rows[j].classList.toggle("text-white", checked);
      }
    }
  }

  /**
   * Sets query parameter with the colors from the UI.
   */
  function updateColorURLParams() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const inputs = document.querySelectorAll(".legend-item input[type='text']");
    const checkboxes = document.querySelectorAll(".legend-item input[type='checkbox']")
    let i, l, color;
    for (i = 0, l = inputs.length; i < l; i++) {
      color = inputs[i].value;
      if ((color.length !== 4 && color.length !== 7) || color.charAt(0) !== "#") {
        continue;
      }
      params.set(inputs[i].id, color.replace("#", ""));
    }
    for (i = 0, l = checkboxes.length; i < l; i++) {
      params.set(checkboxes[i].id, checkboxes[i].checked.toString());
    }
    params.set("indicatorIcon", document.querySelector("body").classList.contains("indicator-icon").toString());
    url.search = params.toString();
    history.replaceState({}, "", url.toString());
  }

  /**
   * Sets query parameter with the colors from the UI.
   */
  function updateColorsFromURLParams() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const inputs = document.querySelectorAll(".legend-item input[type='text']");
    const checkboxes = document.querySelectorAll(".legend-item input[type='checkbox']")
    let i, l, color;
    for (i = 0, l = inputs.length; i < l; i++) {
      color = params.get(inputs[i].id);
      if (color === null) {
        continue;
      }
      color = "#" + color;
      if ((color.length !== 4 && color.length !== 7) || color.charAt(0) !== "#") {
        continue;
      }
      inputs[i].value = color;
    }
    for (i = 0, l = checkboxes.length; i < l; i++) {
      color = params.get(checkboxes[i].id);
      if (color === null || (color !== "true" && color !== "false")) {
        continue;
      }
      checkboxes[i].checked = (color === "true") ? true : false;
    }
    if (params.get("indicatorIcon") === "true") {
      toggleIndicatorType();
    }
  }

  /**
   * Toggles the type of indicator shown and the UI elements for it
   */
  function toggleIndicatorType() {
    return;
    document.querySelector("body").classList.toggle("indicator-icon");
    const button = document.querySelector("#icon-toggle");
    const text = document.querySelector("#icon-toggle-text");
    if (button.textContent.includes("Icons")) {
      button.textContent = button.textContent.replace("Icons", "Text");
      text.textContent = text.textContent.replace("Text", "Icons");
    } else {
      button.textContent = button.textContent.replace("Text", "Icons");
      text.textContent = text.textContent.replace("Icons", "Text");
    }
    updateColorURLParams();
  }

  /**
   * Restores colors to their defaults.
   */
  function resetColorsToDefault() {
    const inputs = document.querySelectorAll(".legend-item input[type='text']");
    const defaults = {
      precip: "#ffffff",
      evap: "#ffffff",
      soil: "#ffffff",
      stream: "#ffffff",
      runoff: "#ffffff",
      palmer: "#ffffff",
      groundwater: "#ffffff",
    }
    const checkboxInputs = document.querySelectorAll(".legend-item input[type='checkbox']");
    const checkboxDefaults = {
      precipText: false,
      evapText: false,
      soilText: false,
      streamText: false,
      runoffText: false,
      palmerText: false,
      groundwaterText: false,
    }
    let i, l;
    for (i = 0, l = inputs.length; i < l; i++) {
      inputs[i].value = defaults[inputs[i].id];
    }
    for (i = 0, l = checkboxInputs.length; i < l; i++) {
      checkboxInputs[i].checked = checkboxDefaults[checkboxInputs[i].id];
    }
    updateColors();
    updateTextColors();
    updateColorURLParams();
  }

  /**
   * Briefly flashes a help message on the page to let the user knows their clipboard has been modified.
   */
  function clipboardMessage() {
    const message = document.createElement("div");
    message.textContent = "Successfully copied to clipboard";
    message.className = "font-body-xl padding-4 display-inline-block position-fixed radius-pill shadow-1";
    message.style.background = "rgba(226, 226, 226, .85)";
    message.style.top = "50%";
    message.style.left = "50%";
    message.style.transform = "translate(-50%, -50%)";
    document.querySelector("body").append(message);
    setTimeout(function () {
      message.remove();
    }, 500);
  }

  /**
   * Copies GDAL output to the user's clipboard.
   * @param {Event} e - Click event on the Pre element.
   */
  function copyToClipboard(e) {
    const content = e.target.textContent;
    if (!content || !navigator.clipboard) {
      return;
    }
    navigator.clipboard.writeText(content).then(clipboardMessage);
  }
})();
