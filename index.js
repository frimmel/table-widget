/**
 * @file Sets up utilities for parsing the CSV and building the table from it.
 */
(function() {
  "use strict";

  (function main() {
    bindListeners()
  }());

  /**
   * Binds needed event listeners.
   */
  function bindListeners() {
    document.querySelector("#file").addEventListener("change", handleFileUpload);
    document.querySelector("#tabs").addEventListener("click", handleTabClick);
    dropHandlers();
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
      dropZone.classList.add("file-accent")
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("file-accent")
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
    document.querySelector("#table-default").append(table)
    const mergedTable = generateTable(reprocessMergedData(data), getMergedRenderKeys());
    document.querySelector("#table-merged").append(mergedTable)
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
        parsedData[headers[j]] = line[j];
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
      if (item.Timescale === "N/A" || item.Timescale === "TBD") {
        continue;
      }
      item.Indicator = `${item.Timescale} ${item.Indicator}`;
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
    const newData = [];
    const [regions, seasons] = [getRegions(), getSeasons()];
    let i, j, l, ll, key, newSubset;
    for (i = 0, l = regions.length; i < l; i++) {
      for (j = 0, ll = seasons.length; j < ll; j++) {
        key = `${regions[i]} - ${seasons[j]}`;
        newSubset = mergeItems(data, key);
        newData.push(...newSubset);
      }
    }
    return newData;
  }

  /**
   * 
   * @param {*} data 
   * @param {*} key 
   * @returns 
   */
  function mergeItems(data, key) {
    data.sort(function (a, b) {
      return parseFloat(b[key]) - parseFloat(a[key]);
    });
    const clonedData = JSON.parse(JSON.stringify(data.slice(0, 15)));
    clonedData.sort(function (a, b) {
      if (a.Timescale === "N/A" && b.Timescale !== "N/A") {
        return -1;
      }
      if (a.Timescale !== "N/A" && b.Timescale === "N/A") {
        return 1;
      }
      if (a.Timescale === "N/A" && b.Timescale === "N/A") {
        return 0;
      }
      return parseInt(a.Timescale) - parseInt(b.Timescale);
    })
    const newData = [clonedData.shift()];
    let i, j, l, ll, addDataFlag;
    for (i = 0, l = clonedData.length; i < l; i++) {
      addDataFlag = true;
      for (j = 0, ll = newData.length; j < ll; j++) {
        if (clonedData[i]["Dataset Group"] !== newData[j]["Dataset Group"]) {
          continue;
        }
        addDataFlag = false;
        newData[j].Timescale += `, ${clonedData[i].Timescale}`;
        newData[j][key] = Math.max(parseFloat(newData[j][key]), parseFloat(clonedData[i][key]));
      }
      if (addDataFlag) {
        newData.push(clonedData[i]);
      }
    }
    const [regions, seasons] = [getRegions(), getSeasons()];
    let k, lll, resetKey;
    for (i = 0, l = regions.length; i < l; i++) {
      for (j = 0, ll = seasons.length; j < ll; j++) {
        resetKey = `${regions[i]} - ${seasons[j]}`;
        for (k = 0, lll = newData.length; k < lll; k++) {
          if (key !== resetKey) {
            newData[k][resetKey] = 0;
          }
        }
      }
    }
    newData.sort(function (a, b) {
      return parseFloat(b[key]) - parseFloat(a[key]);
    });
    return newData;
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
        td.textContent = data[i][renderKeys[j]];
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
    //return ["Indicator", "Timescale", "What is This, and How Do I Use It?", "Datasets In Study", "Additional Datasets"];
    return ["Indicator", "What is This, and How Do I Use It?", "Datasets In Study", "Additional Datasets"];
  }

    /**
   * Gets the keys of data which is rendered in the merged table.
   * @return {array} - Keys which are rendered in the table and used as headers.
   * @todo Determine these dynamically if needed.
   */
    function getMergedRenderKeys() {
      return ["Indicator", "Timescale", "What is This, and How Do I Use It?", "Datasets In Study", "Additional Datasets"];
    }

  /**
   * Gets the names of the regions.
   * @return {array} - Parts of the keys which grab the FI data for sorting.
   * @todo Determine these dynamically if needed.
   */
  function getRegions() {
    return ["High Plains", "Northeast", "South", "Southeast", "West"];
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
})()