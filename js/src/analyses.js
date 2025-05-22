import { map, marker } from './map.js';
import { drawChart, myChart } from './chart.js';

const analyseRaster = (lng, lat, timestamps, year) => {

    const ids = timestamps.map(item => item.id);
    const current_timestamp = timestamps.find(item => item.description === year.toString());
	
	const geometry = {
		type: "Point",
		coordinates: [lng, lat]
	};

	const rasterAnalysesUrl = 'https://api.ellipsis-drive.com/v3/path/be1e61d7-f9c7-488c-985f-cd97f7e7a04b/raster/timestamp/analyse';

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
			document.querySelector("#cluster_div").innerHTML = 'Selected cluster: '+cluster_value+ ' ('+year+')';
			createEllipsisSelectionRaster(cluster_value, current_timestamp.id);
			document.querySelector("#analysis_block").setAttribute("expanded", true);
			document.querySelector("#chart_block").setAttribute("expanded", true);
			drawChart(data);
			myChart.resize({
				width: document.querySelector("#chart_block").offsetWidth - 10,
				height: 250
			});
		} else {
			clearPred55Selection();
			// Aggiorna area di notifica
			document.querySelector("#cluster_div").innerHTML = '...';
			document.querySelector("#analysis_block").removeAttribute("expanded");
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
							
	clearPred55Selection();
					
	const provna55_sel = await MapboxgljsEllipsis.AsyncEllipsisRasterLayer({
		pathId: "be1e61d7-f9c7-488c-985f-cd97f7e7a04b",
		timestampId: timestampId,
		style: selection_style
	});
	provna55_sel.id = 'pred55_selection';
	provna55_sel.addTo(map);
	map.setPaintProperty('pred55', 'raster-opacity', 0.55);
};


const clearPred55Selection = () => {
	if (map.getLayer('pred55_selection')) {
		// Rimuovi layer
		map.removeLayer('pred55_selection');
		// Rimuovi la sorgente
		map.removeSource('pred55_selection_source');
		// Ripristina opacità pred55
		map.setPaintProperty('pred55', 'raster-opacity', 1);
	}
}

export { analyseRaster, clearPred55Selection };