// Loads and parses the Google Sheets CSV, then logs the result to the console
(function(){
  window.SZ = window.SZ || {};
  window.SZ.utils = window.SZ.utils || {};

  window.SZ.utils.loadCsv = async function(filePath) {
    if (!window.SZ || !window.SZ.http || !window.SZ.csv) {
      console.error("SZ utils not loaded");
      return;
    }
    try {
      const res = await window.SZ.http.fetchWithRetry(filePath);
      if (!res.ok) throw new Error(`Failed to fetch CSV from ${filePath}`);
      const text = res.text;
      const data = window.SZ.csv.parseCSVToObjects(text);
      return data;
    } catch (err) {
      console.error(`Error fetching or parsing CSV from ${filePath}:`, err);
      return [];
    }
  };
})();