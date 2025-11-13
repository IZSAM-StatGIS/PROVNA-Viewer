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

export { readCSV, buildLocationsFromGeoJSON };
