import { map } from './map.js';

// csv-layer.js

const readCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject("Error reading file");
    reader.onload = () => {
      try {
        const text = reader.result.trim();
        const rows = text.split(/\r?\n/).map(r => r.split(/[;,]/));

        if (rows.length < 2) {
          reject("Empty or invalid CSV file");
          return;
        }

        // headers normalizzati
        const headers = rows[0].map(h => h.trim().toLowerCase());

        const latNames = ["lat", "latitude"];
        const lonNames = ["lon", "lng", "longitude"];

        const latIdx = headers.findIndex(h => latNames.includes(h));
        const lonIdx = headers.findIndex(h => lonNames.includes(h));

        if (latIdx === -1 || lonIdx === -1) {
          reject("The file must be a CSV containing the 'lat'/'lon' or 'latitude'/'longitude' columns");
          return;
        }

        const features = [];

        rows.slice(1).forEach((row, i) => {

          const latStr = row[latIdx];   // stringa originale dal CSV
          const lonStr = row[lonIdx];

          const lat = parseFloat(latStr); // numero per MapLibre
          const lon = parseFloat(lonStr);

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
            properties: Object.fromEntries(
              headers.map((h, j) => [h, row[j]])
              // 👆 mantiene lat/lon originali così come sono nel CSV
            )
          });

        });

        if (features.length === 0) {
          reject("No valid points found in CSV");
          return;
        }

        resolve({
          type: "FeatureCollection",
          features
        });

      } catch (err) {
        reject(`CSV error: ${err}`);
      }
    };

    reader.readAsText(file);
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

/*
const getLocationInfo = async (pathId, timestampId, locations) => {

  console.log("getLocationInfo called with params:", locations, "pathId:", pathId, "timestampId:", timestampId, "year:", year);

  if (!locations || locations.length === 0) {
    console.warn("getLocationInfo: nessuna location fornita");
    return [];
  }

  // parametro locations come JSON in querystring
  const locationsParam = JSON.stringify(locations);
  const url = `https://api.ellipsis-drive.com/v3/path/${pathId}/raster/timestamp/${timestampId}/location?locations=${locationsParam}`;

  console.log("GET:", url);

  const response = await fetch(url, {method: "GET"});

  if (!response.ok) {
    throw new Error(`GetLocationInfo error: ${response.status} ${response.statusText}`);
  }

  const raw = await response.json();
  console.log("Raw LocationInfo response:", raw);

  // raw è un array di array: [[val, 65535], [val, 65535], ...]
  // prendiamo SOLO il primo valore di ogni coppia
  const values = raw.map(item => item[0]);

  return values;
}
*/

// Versione single-point mode:
// → ogni coordinata viene interrogata con una richiesta separata
// → garantisce valori identici al risultato della analyse e accuratezza al pixel
// → evita le differenze introdotte dalle richieste batch
const getLocationInfo = async (pathId, timestampId, locations) => {

  console.log("getLocationInfo called with params:", locations, "pathId:", pathId, "timestampId:", timestampId);

  if (!locations || locations.length === 0) {
    console.warn("getLocationInfo: nessuna location fornita");
    return [];
  }

  const statusEl = document.querySelector("#upload_status");

  statusEl.textContent = "Fetching location info for " + locations.length + " points...";
  statusEl.classList.add("upload-blink"); // 🔥 INIZIA A LAMPEGGIARE

  const results = [];

  // Chiamata accurata: una richiesta per ogni singolo punto
  for (const loc of locations) {

    // loc = [lon, lat] → formattiamo come [[lon,lat]]
    const locParam = JSON.stringify([loc]);
    const url = 
      `https://api.ellipsis-drive.com/v3/path/${pathId}` +
      `/raster/timestamp/${timestampId}/location?locations=${locParam}`;

    console.log("GET (single-point):", url);

    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      throw new Error(`GetLocationInfo error: ${response.status} ${response.message}`);
    }

    const raw = await response.json();
    console.log("Raw single response:", raw);

    const value = raw[0][0];   // primo valore della coppia
    results.push(value);
  }

  // 🔥 STOP LAMPEGGIO
  statusEl.classList.remove("upload-blink");
  
  // 🔢 Conteggi
  const total = results.length;
  const zeros = results.filter(v => v === 0).length;

  // 📝 Messaggio finale
  let msg = `${total} points loaded`;
  if (zeros > 0) {
    msg += ` (${zeros} outside the ecoregions area)`;
  }

  statusEl.textContent = msg;

  return results; // es: [1253, 1470, 1320, ...]
};



export { readCSV, buildLocationsFromGeoJSON, getLocationInfo };
