(function() {
  "use strict";

  (function main() {
    const csv = getData()
    const data = parseCSV(csv);
    if (data === null) {
      console.error("Unable to parse data", csv);
      return;
    }
    const table = generateTable(data);
    document.querySelector("body").append(table)
  }());

  // Initial stub. Grabs a hardcoded export of the data but it will eventually get data from a user uploaded CSV.
  function getData() {
    return window.data;
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
   * Creates the complete HTML for the end table widget, with all children.
   * @param {array} data - Array of objects of parsed CSV data. Result of parseCSV(getData())
   * @return {HTMLTableElement} - The complete HTML table.
   */
  function generateTable(data) {
    const [renderKeys, regions, seasons] = [getRenderKeys(), getRegions(), getSeasons()];
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
      tr = createElement("tr", i > 14 ? "display-none" : "");
      addFIData(tr, data[i], regions, seasons);
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
})()