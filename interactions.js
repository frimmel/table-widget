/**
 * @file Sets up the dynamic interactions for the UI once the table has been built. A version will be ported to site.
 */
(function() {
  "use strict";

  (function main() {
    bindListeners();
  })();

  /**
   * Binds listeners. Uses delegation since the UI will be added dynamically later.
   */
  function bindListeners() {
    document.addEventListener("input", handleSelectInput);
  }

  /**
   * Triggers the updates to the table when the Select lists are interacted with.
   * @param {Event} e - An Input event.
   */
  function handleSelectInput(e) {
    if (e.target.tagName !== "SELECT") {
      return;
    }
    if (!document.querySelector("table")) {
      return;
    }
    updateTables()
  }

  /**
   * Updates the tables to the selected region and season
   */
  function updateTables() {
    const tBody = document.querySelectorAll("table tbody");
    let i, l;
    for (i = 0, l = tBody.length; i < l; i++) {
      updateTable(tBody[i])
    }
  }

  /**
   * Updates the table to the selected region and season
   */
  function updateTable(tBody) {
    const rows = Array.from(tBody.querySelectorAll("tr")).sort(sortRows);
    rows.forEach(updateDisplayClasses)
    rows.forEach((row) => tBody.appendChild(row));
  }

  /**
   * Creates the string of the data attribute name for a region/season pair. "data-[Region - lowercase]-[Season]"
   * @param {string} region - Lowercase region.
   * @param {string} season - Lowercase season.
   * @return {string} - "data-[Region - lowercase]-[Season - lowercase]"
   */
  function makeDataAttr(region, season) {
    return `data-${region}-${season}`;
  }

  /**
   * Sort rows in descending order by their region/season FI values bound to data attributes.
   * @param {Element} a - a tr element.
   * @param {Element} b - a tr element.
   * @return {number} - < 0 a before b, > 0 b before a, 0 stay the same
   */
  function sortRows(a, b) {
    const region = document.querySelector("#ui--dropdowns--region").value;
    const season = document.querySelector("#ui--dropdowns--season").value;
    const dataAttr = makeDataAttr(region, season);
    return b.getAttribute(dataAttr) - a.getAttribute(dataAttr);
  }

  /**
   * Only display the top 15 results.
   * @param {Element} elem - a tr element.
   * @param {number} index - the index
   */
  function updateDisplayClasses(elem, index) {
    const region = document.querySelector("#ui--dropdowns--region").value;
    const season = document.querySelector("#ui--dropdowns--season").value;
    const dataAttr = makeDataAttr(region, season);
    if (index > 14 || parseFloat(elem[dataAttr]) === 0) {
      elem.classList.add("display-none");
    } else {
      elem.classList.remove("display-none");
    }
  }
})()