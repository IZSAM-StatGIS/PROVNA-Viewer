import { analyseRaster, clearpredLayerSelection } from "./analyses.js";
import { readCSV, buildLocationsFromGeoJSON, getLocationInfo, geojsonToXLSX, downloadGeoJSON } from "./csv-layer.js";

let map, marker, prediction_pathId = '130cddc5-ce47-45b2-abfe-0961e3e597cd';
const initMap = () => {
	map = new maplibregl.Map({
		container: 'map', // container id
		center: [24, 42], // starting position [lng, lat]
		zoom: 3.0, // starting zoom
		style: {
			version: 8,
			sources: {},
			layers: [],
			// glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=AlNInvvaWSvJjPJR6yim'
		},

	});
	map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
	map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

	// disable map rotation using right click + drag
	map.dragRotate.disable();

	// disable map rotation using keyboard
	map.keyboard.disable();

	map.on('load', () => {

		// Aggiunge il layer satellitare esri
		map.addSource('arcgis-imagery', {
			type: 'raster',
			tiles: [
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
			],
			tileSize: 256,
			attribution:
				'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, etc.'
		});

		map.addLayer({
			id: 'arcgis-imagery-layer',
			type: 'raster',
			source: 'arcgis-imagery',
			minzoom: 0,
			maxzoom: 19
		});

		// Aggiunge il layer OSM
		map.addSource('osm-basemap', {
			type: 'raster',
			tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
			tileSize: 256,
			attribution: '© OpenStreetMap contributors'
		});
		map.addLayer({
			id: 'osm-basemap-layer',
			type: 'raster',
			source: 'osm-basemap',
			layout: { visibility: 'none' } // inizialmente nascosto
		});

		// Aggiunge il layer OSM
		map.addSource('dark-matter', {
			type: 'raster',
			tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
			tileSize: 256,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
		});
		map.addLayer({
			id: 'dark-basemap-layer',
			type: 'raster',
			source: 'dark-matter',
			layout: { visibility: 'none' } // inizialmente nascosto
		});

		// Vector layer
		const boundaries = new MapboxgljsEllipsis.EllipsisVectorLayer({
			pathId: '902691e0-01c5-4d56-ab57-c4a7f78f2d97',
			id: 'boundaries',
			onlyTiles: true,
		})
		boundaries.addTo(map)

		const ws_line = new MapboxgljsEllipsis.EllipsisVectorLayer({
			pathId: 'adead386-9b18-4a5e-8a3e-993726207e87',
			id: 'ws_line',
			onlyTiles: true,
		})
		ws_line.addTo(map)

		fetchPredTimestamps();

	});

	map.on('click', (e) => {

		if (map.getLayer('csv-points')) {
			const features = map.queryRenderedFeatures(e.point, { layers: ["csv-points"] });
			if (features.length > 0) return;  // 👉 ignora click perché stai cliccando un punto
		}

		const { lng, lat } = e.lngLat;
		let selected_year = document.querySelector("#year_slider").value;
		// Se esiste un marker, lo rimuove
		if (marker) {
			marker.remove();
		}
		// Crea un nuovo marker e lo aggiunge alla mappa
		marker = new maplibregl.Marker({ color: '#39BEBA' })
			.setLngLat([lng, lat])
			.addTo(map);

		analyseRaster(lng, lat, predLayer_timestampIds, selected_year);

		/*document.querySelector("#clicked_div")
			.innerHTML = "Cluster values at the clicked location ("+lng.toFixed(5).toString() +", "+lat.toFixed(5).toString()+")";*/

		document.querySelector("#lng_input").value = lng.toFixed(5).toString();
		document.querySelector("#lat_input").value = lat.toFixed(5).toString();

	});

	document.querySelector("#marker_btn").addEventListener("click", () => {
		let selected_year = document.querySelector("#year_slider").value;
		let lng = parseFloat(document.querySelector("#lng_input").value);
		let lat = parseFloat(document.querySelector("#lat_input").value);
		if (marker) {
			marker.remove(); // Rimuove il marker esistente
		}
		// Crea un nuovo marker e lo aggiunge alla mappa
		marker = new maplibregl.Marker({ color: '#39BEBA' })
			.setLngLat([lng, lat])
			.addTo(map);

		analyseRaster(lng, lat, predLayer_timestampIds, selected_year);
	});

	document.querySelector("#plot_variables_btn").addEventListener("click", () => {
		let lng = parseFloat(document.querySelector("#lng_input").value);
		let lat = parseFloat(document.querySelector("#lat_input").value);

		const plot_dialog = document.querySelector("#plot-dialog");
		plot_dialog.setAttribute("open", true);
		plot_dialog.setAttribute("heading", `ECOPATH at Lon: ${lng.toFixed(5)} and Lat: ${lat.toFixed(5)}`);

		const img = document.querySelector("#plot_img")
		const statusEl = document.querySelector("#plot_status"); // <div> opzionale per messaggi
		if (statusEl) statusEl.innerHTML = "Loading image...";
		plot_dialog.setAttribute("loading", true);

		// console.log("Plotting variables for:", lng, lat, prediction_pathId);
		const base = "https://wstest.izs.it/SpatNTW_ECOPATH_COORDS";

		// Costruisci URL in modo robusto
		const url = new URL(base);
		url.search = new URLSearchParams({
			LON: String(lng),
			LAT: String(lat),
			_t: Date.now().toString() // cache-busting
		}).toString();

		// Gestione eventi immagine
		img.onload = () => {
			plot_dialog.removeAttribute("loading");
			img.title = `LON=${lng}, LAT=${lat}`;
			img.alt = "ECOPATH";

			const panzoom = new Panzoom(img);
			img.addEventListener('wheel', panzoom.zoomWithWheel);

			if (statusEl) {
				statusEl.innerHTML = "";
				// Controlli panzoom

				const zoomin_btn = document.createElement("calcite-button");
				zoomin_btn.id = "panzoom_reset_btn";
				zoomin_btn.iconStart = "magnifying-glass-plus";
				zoomin_btn.textContent = "Zoom in";
				statusEl.appendChild(zoomin_btn);
				zoomin_btn.addEventListener("click", () => {
					panzoom.zoomIn();
				});

				statusEl.appendChild(document.createTextNode(" ")); // spazio

				const zoomout_btn = document.createElement("calcite-button");
				zoomout_btn.id = "panzoom_reset_btn";
				zoomout_btn.iconStart = "magnifying-glass-minus";
				zoomout_btn.textContent = "Zoom out";
				statusEl.appendChild(zoomout_btn);
				zoomout_btn.addEventListener("click", () => {
					panzoom.zoomOut();
				});

				statusEl.appendChild(document.createTextNode(" ")); // spazio

				const reset_btn = document.createElement("calcite-button");
				reset_btn.id = "panzoom_reset_btn";
				reset_btn.iconStart = "reset";
				reset_btn.textContent = "Reset zoom/pan";
				statusEl.appendChild(reset_btn);
				reset_btn.addEventListener("click", () => {
					panzoom.reset();
				});

				// Crea il bottone per aprire in un'altra scheda. Il link viene chiamato con JS per evitare url visibile in basso a sx
				/*
				const btn = document.createElement("calcite-button");
				btn.id = "ecopath_new_tab_btn";
				btn.iconStart = "launch";
				btn.type = "button";
				btn.textContent = "Open at full resolution in a new tab";
				statusEl.appendChild(btn);

				btn.addEventListener("click", () => {
					const fullUrl = `${base}?LON=${lng}&LAT=${lat}`;
					window.open(fullUrl, "_blank");
				});*/
			}
		};
		img.onerror = () => {
			img.alt = "Error loading image";
			if (statusEl) statusEl.textContent = "Impossible to load the image";
		};

		// Assegna src per innescare il download
		img.src = url.toString();

	});

	document.addEventListener("calciteColorPickerChange", (e) => {
		if (marker) {
			// console.log("Color changed:", e.target.value);
			// console.log(marker.getLngLat())
			let { lng, lat } = marker.getLngLat();
			let selected_year = document.querySelector("#year_slider").value.toString();
			analyseRaster(lng, lat, predLayer_timestampIds, selected_year);
		}
	});

	document.querySelector("#pred_sel_color_reset").addEventListener("click", () => {
		document.querySelector("#pred_sel_color").value = '#FFE700'; // Reset to default color
		if (marker) {
			// console.log("Color changed:", e.target.value);
			// console.log(marker.getLngLat())
			let { lng, lat } = marker.getLngLat();
			let selected_year = document.querySelector("#year_slider").value.toString();
			analyseRaster(lng, lat, predLayer_timestampIds, selected_year);
		}
	});

	map.on('mousemove', (e) => {
		let { lng, lat } = e.lngLat.wrap();
		// console.log("Mouse coordinates:", lng, lat);
		document.getElementById('mouse_coordinates').innerHTML = `Mouse position: ${lng.toFixed(5)}, ${lat.toFixed(5)}`;
	});

	// Fetch per ottenere i timestampId del layer pred
	let predLayer_timestampIds = [];

	const fetchPredTimestamps = async () => {

		// Recupera i timestampId del layer ellipsis e chiama la funzione per aggiungere il layer
		const pred_url = "https://api.ellipsis-drive.com/v3/path/" + prediction_pathId;
		// console.log("Fetching timestamps from:", pred_url);
		fetch(pred_url).then(response => {
			return response.json();
		}).then(data => {
			prediction_pathId = document.querySelector("#pred_combobox").value;
			// console.log('Risposta dal server:', data.raster.timestamps);
			predLayer_timestampIds = []; // Reset the array to avoid duplicates
			const responseData = data.raster.timestamps;
			predLayer_timestampIds.push(...responseData.map(item => item));

			const last_timestampId = responseData[responseData.length - 1].id;
			createEllipsisRasterLayer(last_timestampId);

			if (marker) {
				const coords = marker.getLngLat();
				const { lng, lat } = coords;
				const selected_year = document.querySelector("#year_slider").value.toString();
				analyseRaster(lng, lat, predLayer_timestampIds, selected_year);
			}

			if (uploadedFile) {
				handleCsvFile(uploadedFile);
			}
		});

	}

	// Aggiungi il layer di Ellipsis
	// - Se non viene passato un timestampId, lo inizializzo sul default di ellipsis (più recente)
	const createEllipsisRasterLayer = async (timestampId) => {

		timestampId = timestampId || '';

		if (map.getLayer('predLayer')) {
			map.removeLayer('predLayer'); // Rimuovi layer
			map.removeSource('predLayer_source'); // Rimuovi la sorgente
		}

		if (map.getLayer('boundaries')) {
			map.removeLayer('boundaries'); // Rimuovi layer
			map.removeSource('boundaries_source'); // Rimuovi la sorgente
		}

		const predLayer = await MapboxgljsEllipsis.AsyncEllipsisRasterLayer({
			pathId: prediction_pathId,
			timestampId: timestampId,
			zoom: 10
		});

		predLayer.id = 'predLayer'; // Assegna un id al layer
		predLayer.addTo(map);
		map.setPaintProperty('predLayer', 'raster-opacity', document.querySelector("#pred_opacity_slider").value * 0.01);

		// 🚀 sposta in cima i boundaries
		const layersOnTheMap = map.getStyle().layers;
		layersOnTheMap
			.filter(layer => layer.id.startsWith('boundaries_'))
			.forEach(layer => {
				// console.log("Spostando layer:", layer.id);
				map.moveLayer(layer.id);
			});

		// 🚀 sposta in cima i punti csv
		layersOnTheMap
			.filter(layer => layer.id.startsWith('csv-points'))
			.forEach(layer => {
				// console.log("Spostando layer:", layer.id);
				map.moveLayer(layer.id);
			});
	};

	// Basemap toggler
	document.querySelector("#basemap_toggler").addEventListener("calciteRadioButtonChange", (e) => {

		let selectedBasemap = e.target.value;

		if (selectedBasemap === 'sat') {
			map.setLayoutProperty('arcgis-imagery-layer', 'visibility', 'visible');
			map.setLayoutProperty('osm-basemap-layer', 'visibility', 'none');
			map.setLayoutProperty('dark-basemap-layer', 'visibility', 'none');
		} else if (selectedBasemap === 'osm') {
			map.setLayoutProperty('arcgis-imagery-layer', 'visibility', 'none');
			map.setLayoutProperty('osm-basemap-layer', 'visibility', 'visible');
			map.setLayoutProperty('dark-basemap-layer', 'visibility', 'none');
		} else if (selectedBasemap === 'dark') {
			map.setLayoutProperty('arcgis-imagery-layer', 'visibility', 'none');
			map.setLayoutProperty('osm-basemap-layer', 'visibility', 'none');
			map.setLayoutProperty('dark-basemap-layer', 'visibility', 'visible');
		}
		/*const esriVisible = map.getLayoutProperty('arcgis-imagery-layer', 'visibility') !== 'none';
		map.setLayoutProperty('arcgis-imagery-layer', 'visibility', esriVisible ? 'none' : 'visible');
		map.setLayoutProperty('osm-basemap-layer', 'visibility', esriVisible ? 'visible' : 'none');*/
	});

	// Opacity slider
	document.querySelector("#pred_opacity_slider").addEventListener("calciteSliderChange", (e) => {
		const opacity_value = e.target.value;
		map.setPaintProperty('predLayer', 'raster-opacity', opacity_value * 0.01);
	});

	// Opacity slider
	document.querySelector("#pred_sel_opacity_slider").addEventListener("calciteSliderChange", (e) => {
		const opacity_value = e.target.value;
		map.setPaintProperty('predLayer_selection', 'raster-opacity', opacity_value * 0.01);
	});


	// ComboBox change
	document.querySelector("#pred_combobox").addEventListener("calciteComboboxChange", (e) => {
		console.log(e.target.value);
		prediction_pathId = e.target.value;

		// Attiva o disattiva il bottone per chiamare il plot delle variabili
		if (prediction_pathId === '130cddc5-ce47-45b2-abfe-0961e3e597cd') { // Pred94
			document.querySelector("#plot_variables_btn").setAttribute("disabled", true);
		} else {
			document.querySelector("#plot_variables_btn").removeAttribute("disabled");
		}

		clearpredLayerSelection();
		fetchPredTimestamps();

	});

	// Slider change
	document.querySelector("#year_slider").addEventListener("calciteSliderChange", (e) => {
		let value = e.target.value;
		let selected_year = value.toString();
		let selected_timestampId = predLayer_timestampIds.find(item => item.description === selected_year);
		if (!selected_timestampId) return;
		clearpredLayerSelection()
		createEllipsisRasterLayer(selected_timestampId.id);
		if (marker) {
			const coords = marker.getLngLat();
			const { lng, lat } = coords;
			analyseRaster(lng, lat, predLayer_timestampIds, selected_year);
		}

		if (uploadedFile) {
			handleCsvFile(uploadedFile);
		}
	});

	// UPLOAD CSV LAYER
	// ===========================================================================================

	const handleCsvFile = async (file) => {
		/*if (marker) {
			marker.remove();
			console.log(map.getLayer('predLayer_selection'));
		}*/
		// clearpredLayerSelection();
		// Aggiorna area di notifica
		// document.querySelector("#cluster_div").innerHTML = '...';
		// document.querySelector("#analysis_block").removeAttribute("expanded");
		document.querySelector("#chart_block").removeAttribute("expanded");


		// 1) SE NON C’È FILE → rimuovi il layer
		if (!file) {
			if (map.getLayer("csv-points")) {
				map.removeLayer("csv-points");
			}
			if (map.getLayer("csv-points-outline")) {
				map.removeLayer("csv-points-outline");
			}
			if (map.getSource("csv-points")) {
				map.removeSource("csv-points");
			}
			console.log("Layer CSV rimosso");
			return;
		}

		// 2) SE IL FILE ESISTE → processa CSV normalmente
		try {

			// 1) Leggi CSV → GeoJSON
			const geojson = await readCSV(file);
			// 2) Costruisci locations
			const locations = buildLocationsFromGeoJSON(geojson);
			// 3) Chiamata API GetLocationInfo
			let selected_year = document.querySelector("#year_slider").value;
			let selected_timestampId = predLayer_timestampIds.find(item => String(item.description) === String(selected_year));
			const getLocationInfoResult = await getLocationInfo(prediction_pathId, selected_timestampId.id, locations);
			console.log("getLocationInfo response:", getLocationInfoResult);

			// 4) Aggiungi proprietà ai features del GeoJSON

			// Etichette per pred + anno
			const predType =
				prediction_pathId === "5c59b5a3-a6f6-4697-a2a9-b7b215d1f862"
					? "Pred3600"
					: "Pred94";

			const unifiedAttrName = `Ecoregion (${predType} - ${selected_year})`;

			geojson.features.forEach((feature, index) => {

				const value = getLocationInfoResult[index]; // Numero restituito dall’API

				// Attributo unico
				feature.properties[unifiedAttrName] = value;
			});
			processedCsvGeojson = geojson;   // <-- 🔥 salva il geojson aggiornato

			// 5) Aggiungi layer alla mappa
			if (map.getSource("csv-points")) {
				map.getSource("csv-points").setData(geojson);
				map.setPaintProperty("csv-points", "circle-color", [
					"match",
					["get", unifiedAttrName],   // 👈 NOME DINAMICO DELL'ATTRIBUTO
					0, "#A0A0A0",
					"#007cbf"
				]);

			} else {
				map.addSource("csv-points", {
					type: "geojson",
					data: geojson
				});

				// bordo bianco
				map.addLayer({
					id: "csv-points-outline",
					type: "circle",
					source: "csv-points",
					paint: {
						"circle-radius": 10,
						"circle-color": "#ffffff"
					}
				});

				// punto interno blu
				map.addLayer({
					id: "csv-points",
					type: "circle",
					source: "csv-points",
					paint: {
						"circle-radius": 8,
						"circle-color": [
							"match",
							["get", unifiedAttrName],   // 👈 NOME DINAMICO DELL'ATTRIBUTO
							0, "#A0A0A0",        // ↳ grigio se 0
							"#007cbf"            // ↳ azzurro altrimenti
						]
					}
				});

				const hoverPopup = new maplibregl.Popup({
					closeButton: false,
					closeOnClick: false
				});

				// Feedback visivo e apertura/chiusura del popup al passaggio del mouse
				map.on("mouseenter", "csv-points", (e) => {

					const feature = e.features[0];
					const props = feature.properties;

					// costruzione HTML dinamica
					const html = Object.entries(props)
						.map(([key, value]) => {

							// rileva se la proprietà è l'attributo ecoregion
							const isEcoregion = key.startsWith("Ecoregion (");

							// se è ecoregion e il valore è 0 → mostra "not assigned"
							const displayValue = (isEcoregion && Number(value) === 0)
								? "not assigned"
								: value;

							return `<strong>${key}:</strong> ${displayValue}`;
						})
						.join("<br>");


					hoverPopup
						.setLngLat(feature.geometry.coordinates)
						.setHTML(html)
						.addTo(map);

					map.getCanvas().style.cursor = "pointer";
				});
				map.on("mouseleave", "csv-points", () => {
					hoverPopup.remove();
					map.getCanvas().style.cursor = "";
				});

				// Evento click
				map.on("click", "csv-points", (e) => {

					let selected_year = document.querySelector("#year_slider").value;

					const feature = e.features[0];

					// recupera il nome effettivo delle colonne lat/lon (case-insensitive)
					const findPropKey = (props, names) => {
						const lowerNames = names.map(n => n.toLowerCase());
						return Object.keys(props).find(k => lowerNames.includes(k.trim().toLowerCase()));
					};
					const latField = findPropKey(feature.properties, ["lat", "latitude"]);
					const lonField = findPropKey(feature.properties, ["lon", "lng", "longitude"]);

					// valori originali dal CSV
					const feature_lat = feature.properties[latField];
					const feature_lng = feature.properties[lonField];

					// console.log("Punto cliccato:", feature_lng, feature_lat);

					// Se esiste un marker, lo rimuove
					if (marker) {
						marker.remove();
					}
					// Crea un nuovo marker e lo aggiunge alla mappa
					marker = new maplibregl.Marker({ color: '#39BEBA' })
						.setLngLat([parseFloat(feature_lng), parseFloat(feature_lat)])
						.addTo(map);

					document.querySelector("#lng_input").value = feature_lng.toString();
					document.querySelector("#lat_input").value = feature_lat.toString();

					analyseRaster(parseFloat(feature_lng), parseFloat(feature_lat), predLayer_timestampIds, selected_year);
				});

			}

			// fitBounds sui punti
			const bounds = new maplibregl.LngLatBounds();
			geojson.features.forEach(f => bounds.extend(f.geometry.coordinates));
			if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 80 });

			// Abilita il bottone per scaricare il dato arricchito
			document.querySelector("#download_xlsx_btn").disabled = false;
			document.querySelector("#download_geojson_btn").disabled = false;

		} catch (err) {
			console.error(err);
			alert(err);
		}
	}

	// File upload handler
	let uploadedFile = null;
	let processedCsvGeojson = null;

	document.querySelector('#input_file').addEventListener('calciteInputInput', async (event) => {
		const file = event.target.files[0];
		if (file) {
			uploadedFile = file;
			handleCsvFile(file);
		}

	});

	document.querySelector("#clear_csv_btn").addEventListener("click", () => {

		uploadedFile = null;

		// Rimuovi i due layer se esistono
		if (map.getLayer("csv-points")) {
			map.removeLayer("csv-points");
		}
		if (map.getLayer("csv-points-outline")) {
			map.removeLayer("csv-points-outline");
		}

		// Rimuovi la sorgente
		if (map.getSource("csv-points")) {
			map.removeSource("csv-points");
		}

		// Rimuovi l’eventuale marker cliccato
		if (marker) {
			marker.remove();
			marker = null;
		}
		// Rimuove risultati precedenti
		clearpredLayerSelection();
		// Aggiorna area di notifica
		document.querySelector("#cluster_div").innerHTML = '...';
		// document.querySelector("#analysis_block").removeAttribute("expanded");
		document.querySelector("#chart_block").removeAttribute("expanded");

		// Resetta il campo file (Calcite)
		const fileInput = document.querySelector("#input_file");
		if (fileInput) {
			fileInput.value = "";               // HTML standard
			fileInput.dispatchEvent(new Event("calciteInputInput")); // forza update
		}

		// Pulisce l’area di stato upload
		document.querySelector("#upload_status").innerHTML = '';

		// RESET MAPPA al punto iniziale
		map.flyTo({
			center: [11, 28],
			zoom: 3.5,
			speed: 0.8
		});

		// Disabilita il bottone per scaricare il dato arricchito
		document.querySelector("#download_xlsx_btn").disabled = true;
		document.querySelector("#download_geojson_btn").disabled = true;

	});

	// Download XLSX arricchito
	document.querySelector("#download_xlsx_btn").addEventListener("click", () => {
		if (!processedCsvGeojson) {
			alert("No enriched data available.");
			return;
		}
		geojsonToXLSX(processedCsvGeojson, "enriched_points.xlsx");
	});


	// Download GeoJSON arricchito
	document.querySelector("#download_geojson_btn").addEventListener("click", () => {

		if (!processedCsvGeojson) {
			alert("No enriched GeoJSON available to download.");
			return;
		}

		downloadGeoJSON(processedCsvGeojson, "enriched_points.geojson");
	});

}

export { initMap, map, marker, prediction_pathId };
