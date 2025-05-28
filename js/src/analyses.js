import { map, marker, prediction_pathId } from './map.js';
import { drawChart, myChart } from './chart.js';

const analyseRaster = (lng, lat, timestamps, year) => {

    const ids = timestamps.map(item => item.id);
    const current_timestamp = timestamps.find(item => item.description === year.toString());
	
	const geometry = {
		type: "Point",
		coordinates: [lng, lat]
	};


	const rasterAnalysesUrl = 'https://api.ellipsis-drive.com/v3/path/'+prediction_pathId+'/raster/timestamp/analyse';


	const params = new URLSearchParams({
		timestampIds: JSON.stringify(ids),
		geometry: JSON.stringify(geometry)
	});

	const url = `${rasterAnalysesUrl}?${params.toString()}`;
			
	fetch(url, {
		method: 'GET',
		headers: { 'Accept': 'application/json' }
	}).then(response => {
		return response.json();
	}).then(data => {
		// console.log('Risposta dal server:', data);
        // Accede al valore ritornato dal server per il timestampId corrispondente all'anno selezionato sullo slider
        const current_data = data.find(item => item.timestamp.id === current_timestamp.id);
        // Valore del cluster cliccato sull'immagine dell'anno selezionato
		let cluster_value = current_data.result[0].statistics.mean
		// console.log('Cluster', cluster_value)
		
		if (cluster_value != null) { 
			document.querySelector("#cluster_div").innerHTML = '<strong>'+cluster_value+'</strong>';
			createEllipsisSelectionRaster(cluster_value, current_timestamp.id);
			// document.querySelector("#analysis_block").setAttribute("expanded", true);
			document.querySelector("#chart_block").setAttribute("expanded", true);
			drawChart(data, year);
			myChart.resize({
				width: document.querySelector("#chart_block").offsetWidth - 10,
				height: 250
			});
		} else {
			clearpredLayerSelection();
			// Aggiorna area di notifica
			document.querySelector("#cluster_div").innerHTML = '...';
			// document.querySelector("#analysis_block").removeAttribute("expanded");
			document.querySelector("#chart_block").removeAttribute("expanded");
			document.querySelector("#clicked_div").innerHTML = '...';
			myChart.resize({
				width:0,
				height:0
			});

			// Se esiste un marker, lo rimuove
			if (marker) {
				marker.remove();
			}	
		}
            
	}).catch(error => {
		console.error('Errore nella chiamata fetch:', error);
	});
}

// Raster layer
const createEllipsisSelectionRaster = async (cluster_value, timestampId) => {
	// Stile client side
	const selection_style = {
		parameters: {
			alphaMultiplier: 1,
			fill: {
				defaultTarget: { color: "#CDBA88" },
				type: "caseMap",
				caseMap: [
					{ expression: "band1 == "+cluster_value, target: { color: "#6ffc03" } },
				],
			},
			noData: "band1 != "+cluster_value
		},
		method: "v2",
	};
							
	clearpredLayerSelection();
					
	const provnaSel = await MapboxgljsEllipsis.AsyncEllipsisRasterLayer({
		pathId: prediction_pathId,
		timestampId: timestampId,
		style: selection_style
	});
	provnaSel.id = 'predLayer_selection';
	provnaSel.addTo(map);
	
	// Sblocca lo slider di opacità e riporta l'opacità del layer a 1
	document.querySelector("#pred_sel_opacity_slider").removeAttribute("disabled");
	document.querySelector("#pred_sel_opacity_slider").value = 100;

	// 🚀 sposta in cima i boundaries
		const layersOnTheMap = map.getStyle().layers;
		layersOnTheMap
		.filter(layer => layer.id.startsWith('boundaries_'))  
		.forEach(layer => {
			// console.log("Spostando layer:", layer.id);
			map.moveLayer(layer.id);  
		});
};


const clearpredLayerSelection = () => {
	if (map.getLayer('predLayer_selection')) {
		// Rimuovi layer
		map.removeLayer('predLayer_selection');
		// Rimuovi la sorgente
		map.removeSource('predLayer_selection_source');
		// Blocca lo slider di opacità
		document.querySelector("#pred_sel_opacity_slider").setAttribute("disabled", true);
		// Ripristina opacità predLayer
		// map.setPaintProperty('predLayer', 'raster-opacity', 1);
	}
}

export { analyseRaster, clearpredLayerSelection };