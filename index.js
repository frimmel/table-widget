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

    const headers = lines.shift().split(separator);
    const result = [];
    let i, j, l, ll, line, parsedData;
    for (i = 0, l = lines.length; i < l; i++) {
      line = lines[i].split(separator).map(item => item.trim());
      parsedData = {};
      for (j = 0, ll = line.length; j < ll; j++) {
        parsedData[headers[j]] = line[j];
      }
      result.push(parsedData);
    }
    return result;
  }

  function generateTable(data) {
    const renderKeys = getRenderKeys();
    return document.createElement("table");
  }

  /**
   * Gets the keys of data which is rendered in the table.
   * @return {array} - Keys which are rendered in the table and used as headers.
   * @todo Determine these dynamically if needed.
   */
  function getRenderKeys() {
    return ["Indicator", "Timescale", "Datasets In Study", "Additional Datasets"];
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