import { analyseRaster, clearpredLayerSelection } from "./analyses.js";
import { readCSV } from "./csv-layer.js";

let map, marker, prediction_pathId = 'be1e61d7-f9c7-488c-985f-cd97f7e7a04b';
const initMap = () => {
    map = new maplibregl.Map({
		container: 'map', // container id
		center: [11, 28], // starting position [lng, lat]
		zoom: 3.5, // starting zoom
		style: {
			version: 8,
			sources: {},
			layers: [],
			// glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=AlNInvvaWSvJjPJR6yim'
		},
		
	});
	map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-left');
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

		// Aggiunge le label esri
		/*
	    map.addSource('arcgis-labels', {
            type: 'raster',
            tiles: [
                'https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution:
                'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, etc.'
		});

		map.addLayer({
		    id: 'arcgis-labels-layer',
			type: 'raster',
			source: 'arcgis-labels',
			minzoom: 0,
			maxzoom: 19
		});
		*/

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
			pathId: '0347e311-9427-4891-9087-20a57cb24d5e',
			id: 'boundaries',
			onlyTiles: true,
			// style: 'a1c6ef13-7cf1-4ecf-97fb-f8f28f6dcbd4',
			filter: [
			"any",
				["==", ["get", "country_co"], "MO"],
				["==", ["get", "country_co"], "WI"],
				["==", ["get", "country_co"], "AG"],
				["==", ["get", "country_co"], "MR"],
				["==", ["get", "country_co"], "LY"],
				["==", ["get", "country_co"], "TS"],
				["==", ["get", "country_co"], "EG"],
			],
		})
		
		boundaries.addTo(map)	
		
		fetchPredTimestamps();

	});
   
    map.on('click', (e) => {

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
			let {lng, lat} = marker.getLngLat();
			let selected_year = document.querySelector("#year_slider").value.toString();
			analyseRaster(lng, lat, predLayer_timestampIds, selected_year);
		}
	});

	document.querySelector("#pred_sel_color_reset").addEventListener("click", () => {
		document.querySelector("#pred_sel_color").value = '#00FFFF'; // Reset to default color
		if (marker) {
			// console.log("Color changed:", e.target.value);
			// console.log(marker.getLngLat())
			let {lng, lat} = marker.getLngLat();
			let selected_year = document.querySelector("#year_slider").value.toString();
			analyseRaster(lng, lat, predLayer_timestampIds, selected_year);
		}
	});

	map.on('mousemove', (e) => {
		let {lng, lat} = e.lngLat.wrap();
		// console.log("Mouse coordinates:", lng, lat);
        document.getElementById('mouse_coordinates').innerHTML = `Mouse position: ${lng.toFixed(5)}, ${lat.toFixed(5)}`;
    });

	// Fetch per ottenere i timestampId del layer pred
	let predLayer_timestampIds = [];
	const fetchPredTimestamps = async () => {
		
		// Recupera i timestampId del layer ellipsis e chiama la funzione per aggiungere il layer
		const pred_url = "https://api.ellipsis-drive.com/v3/path/"+prediction_pathId;
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
				let selected_year = document.querySelector("#year_slider").value.toString();
				analyseRaster(lng, lat, predLayer_timestampIds, selected_year);
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
		map.setPaintProperty('predLayer', 'raster-opacity', document.querySelector("#pred_opacity_slider").value*0.01);

		// 🚀 sposta in cima i boundaries
		const layersOnTheMap = map.getStyle().layers;
		layersOnTheMap
		.filter(layer => layer.id.startsWith('boundaries_'))  
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
		map.setPaintProperty('predLayer', 'raster-opacity', opacity_value*0.01);
	});

	// Opacity slider
	document.querySelector("#pred_sel_opacity_slider").addEventListener("calciteSliderChange", (e) => {
		const opacity_value = e.target.value;
		map.setPaintProperty('predLayer_selection', 'raster-opacity', opacity_value*0.01);
	});


	// ComboBox change
	document.querySelector("#pred_combobox").addEventListener("calciteComboboxChange", (e)=>{
		// console.log(e.target.value);
		prediction_pathId = e.target.value;
		let selected_year = document.querySelector("#year_slider").value.toString();
        let selected_timestampId = predLayer_timestampIds.find(item => item.description === selected_year);

		// Attiva o disattiva il bottone per chiamare il plot delle variabili
		if (prediction_pathId === 'be1e61d7-f9c7-488c-985f-cd97f7e7a04b') { // Pred55
			document.querySelector("#plot_variables_btn").setAttribute("disabled", true);
		} else {
			document.querySelector("#plot_variables_btn").removeAttribute("disabled");
		}
		
		clearpredLayerSelection();
		fetchPredTimestamps();
	});
	
    // Slider change
	document.querySelector("#year_slider").addEventListener("calciteSliderChange", (e)=>{
		// console.log(e);
		let value = e.target.value;
		let selected_year = value.toString();
        let selected_timestampId = predLayer_timestampIds.find(item => item.description === selected_year);
        clearpredLayerSelection()
        createEllipsisRasterLayer(selected_timestampId.id);
		if (marker) {
            const coords = marker.getLngLat();
            const { lng, lat } = coords;
            analyseRaster(lng, lat, predLayer_timestampIds, selected_year);
        }
	});

	// File upload handler
	document.querySelector('#input_file').addEventListener('calciteInputInput', async (event) => {

		const file = event.target.files[0];

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
			const geojson = await readCSV(file);
			console.log("GeoJSON generato:", geojson);

			if (map.getSource("csv-points")) {
				map.getSource("csv-points").setData(geojson);
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
						"circle-color": "#007cbf"
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
						.map(([key, value]) => `<strong>${key}:</strong> ${value}`)
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
					const feature_lat = feature.properties.lat;
					const feature_lng = feature.properties.lon;
					console.log("Punto cliccato:", feature_lng, feature_lat);

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
					
					analyseRaster(feature_lng, feature_lat, predLayer_timestampIds, selected_year);
				});

			}

			// fitBounds sui punti
			const bounds = new maplibregl.LngLatBounds();
			geojson.features.forEach(f => bounds.extend(f.geometry.coordinates));
			if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 80 });

		} catch (err) {
			console.error(err);
			alert(err);
		}
	});

	document.querySelector("#clear_csv_btn").addEventListener("click", () => {

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
		// Rimuovi l’eventuale selezione sul predLayer
		let selected_year = document.querySelector("#year_slider").value;
		analyseRaster(0, 0, predLayer_timestampIds, selected_year);

		// Resetta il campo file (Calcite)
		const fileInput = document.querySelector("#input_file");
		if (fileInput) {
			fileInput.value = "";               // HTML standard
			fileInput.dispatchEvent(new Event("calciteInputInput")); // forza update
		}

		// RESET MAPPA al punto iniziale
		map.flyTo({
			center: [11, 28],
			zoom: 3.5,
			speed: 0.8
		});


	});

	
    
}

export { initMap, map, marker, prediction_pathId };
