import { map } from './map.js';


// Pulisce stringhe problematiche nel CSV
const cleanField = (value) => {
  if (value == null) return "";

  let v = String(value).trim();

  // Rimuove doppi apici non chiusi
  if (v.startsWith('"') && !v.endsWith('"')) {
    v = v.replace(/^"/, ""); // rimuovi apice iniziale
  }

  // Rimuove apici finali isolati
  if (v.endsWith('"') && !v.startsWith('"')) {
    v = v.replace(/"$/, "");
  }

  // Doppie virgolette → una sola
  v = v.replace(/""+/g, '"');

  return v;
};

const readCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,          // usa la prima riga come header
      skipEmptyLines: true,
      dynamicTyping: false,  // trattiamo tutto come stringa, poi convertiamo noi
      complete: (results) => {
        const rows = results.data;

        if (!rows.length) {
          reject("Empty or invalid CSV file");
          return;
        }

        // Trova nomi colonne lat/lon
        const headers = Object.keys(rows[0]).map(h => h.trim().toLowerCase());
        const latNames = ["lat", "latitude"];
        const lonNames = ["lon", "lng", "longitude"];

        const latKey = Object.keys(rows[0]).find(
          (k) => latNames.includes(k.trim().toLowerCase())
        );
        const lonKey = Object.keys(rows[0]).find(
          (k) => lonNames.includes(k.trim().toLowerCase())
        );

        if (!latKey || !lonKey) {
          reject("The file must contain 'lat'/'lon' or 'latitude'/'longitude' columns");
          return;
        }

        // Costruisci FeatureCollection
        const features = [];

        rows.forEach((row, i) => {
          const lat = parseFloat(row[latKey]);
          const lon = parseFloat(row[lonKey]);

          if (isNaN(lat) || isNaN(lon)) {
            console.warn(`Row ${i + 2} ignored: invalid coordinates`);
            return;
          }

          features.push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [lon, lat]
            },
            properties: row   // tutte le colonne così come sono, località incluse
          });
        });

        if (!features.length) {
          reject("No valid points found in CSV");
          return;
        }

        resolve({
          type: "FeatureCollection",
          features
        });
      },
      error: (err) => reject(`CSV parse error: ${err}`)
    });
  });
};


const buildLocationsFromGeoJSON = (geojson) => {

  const locations = [];

  geojson.features.forEach(feature => {

    // noms dinamici: lat/latitude, lon/lng/longitude
    const latField = ["lat", "latitude"].find(f => f in feature.properties);
    const lonField = ["lon", "lng", "longitude"].find(f => f in feature.properties);

    if (!latField || !lonField) return; // safety

    // valori originali del CSV (stringhe)
    const latStr = feature.properties[latField];
    const lonStr = feature.properties[lonField];

    // convertiamo in numeri mantenendo i decimali originali
    const latNum = parseFloat(latStr);
    const lonNum = parseFloat(lonStr);

    locations.push([lonNum, latNum]);   // numeri, ordine lon-lat
  });

  return locations;
}

// Versione con batching (max 30 coordinate per richiesta):
// - Rispetta il nuovo limite di Ellipsis Drive
// - Precisa come il single-point mode, molto più veloce
// - Spezza locations in chunk da 30
const getLocationInfo = async (pathId, timestampId, locations) => {

  if (!locations || locations.length === 0) {
    console.warn("getLocationInfo: nessuna location fornita");
    return [];
  }

  const statusEl = document.querySelector("#upload_status");
  statusEl.textContent = `Retrieving ecoregions data for ${locations.length} points...`;
  statusEl.classList.add("upload-blink");

  const MAX_CHUNK = 30;
  const results = [];

  // funzione per dividere in chunk di max 30 elementi
  const chunkArray = (arr, size) =>
    arr.reduce((acc, _, i) => (
      i % size ? acc : [...acc, arr.slice(i, i + size)]
    ), []);

  const chunks = chunkArray(locations, MAX_CHUNK);
  let processed = 0;

  for (const chunk of chunks) {

    // lista di coordinate batchate: [[lon,lat], ...]
    const locParam = JSON.stringify(chunk);
    const url = 
      `https://api.ellipsis-drive.com/v3/path/${pathId}` +
      `/raster/timestamp/${timestampId}/location?locations=${locParam}`;

    console.log("GET batch:", url);

    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      statusEl.classList.remove("upload-blink");
      throw new Error(
        `GetLocationInfo error: ${response.status} ${response.statusText}`
      );
    }

    const raw = await response.json();

    // raw è del tipo: [[val, 65535], [val, 65535], ...]
    raw.forEach(item => results.push(item[0]));

    processed += chunk.length;
    statusEl.textContent = `Retrieving ecoregions data for ${locations.length} points... (${processed}/${locations.length})`;
  }

  // Stop blink
  statusEl.classList.remove("upload-blink");

  const total = results.length;
  const zeros = results.filter(v => v === 0).length;

  // Messaggio finale
  let msg = `${total} points analyzed`;
  if (zeros > 0) msg += ` (${zeros} outside valid raster area)`;

  statusEl.textContent = msg;

  return results;
};

const geojsonToXLSX = (geojson, filename = "export.xlsx") => {

  if (!geojson || !geojson.features.length) {
    alert("No data available to export.");
    return;
  }

  // 1) Recupera tutte le colonne presenti
  const allKeys = new Set();
  geojson.features.forEach(f => {
    Object.keys(f.properties).forEach(k => allKeys.add(k));
  });

  const headers = Array.from(allKeys);

  // 2) Costruisci array di oggetti per XLSX
  const rows = geojson.features.map(f => {
    const obj = {};

    headers.forEach(h => {
      let v = f.properties[h] ?? "";

      // Ecoregion = 0 → "not assigned"
      if (h.startsWith("Ecoregion (") && Number(v) === 0) {
        v = "not assigned";
      }

      // Evita che Excel converta numeri → date
      if (typeof v === "number") {
        v = String(v); 
      }

      obj[h] = v;
    });

    return obj;
  });

  // 3) Converti in foglio Excel
  const ws = XLSX.utils.json_to_sheet(rows);

  // ---------------------------
  //  OPTIONAL: autosize column widths
  // ---------------------------
  ws['!cols'] = headers.map(h => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => (r[h] ? r[h].toString().length : 0))
    );
    return { wch: Math.min(maxLen + 2, 40) }; // max 40 char per colonna
  });

  // 4) Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  // 5) Scarica
  XLSX.writeFile(wb, filename);
};

const downloadGeoJSON = (geojson, filename = "data.geojson") => {
  const jsonString = JSON.stringify(geojson, null, 2); // indentato, più leggibile
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
};

export { readCSV, buildLocationsFromGeoJSON, getLocationInfo, geojsonToXLSX, downloadGeoJSON };
