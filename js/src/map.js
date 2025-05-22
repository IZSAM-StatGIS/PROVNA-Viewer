import { analyseRaster, clearPred55Selection } from "./analyses.js";

let map, marker;
const initMap = () => {
    map = new maplibregl.Map({
		container: 'map', // container id
		center: [11, 28], // starting position [lng, lat]
		zoom: 3, // starting zoom
		style: {
			version: 8,
			sources: {},
			layers: []
		}
	});
	map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-left');
	map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
	// map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    const pred55_timestampIds = [];

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

        // Recupera i timestampId del layer ellipsis e chiama la funzione per aggiungere il layer
		const pred55_url = "https://api.ellipsis-drive.com/v3/path/be1e61d7-f9c7-488c-985f-cd97f7e7a04b";
		fetch(pred55_url).then(response => {
			return response.json();
		}).then(data => {
			// console.log('Risposta dal server:', data.raster.timestamps);
			const responseData = data.raster.timestamps;
            pred55_timestampIds.push(...responseData.map(item => item));
            
            const last_timestampId = responseData[responseData.length - 1].id;
            createEllipsisRasterLayer(last_timestampId); // Equivalente a createEllipsisRasterLayer();
		});	
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
		
        analyseRaster(lng, lat, pred55_timestampIds, selected_year);
        
		document.querySelector("#clicked_div")
			.innerHTML = "The chart reports the cluster values at the clicked point ("+lng.toFixed(5).toString() +", "+lat.toFixed(5).toString()+") for the entire timeseries";
        
    });

    // Aggiungi il layer di Ellipsis
    // - Se non viene passato un timestampId, lo inizializzo sul default di ellipsis (più recente)
    const createEllipsisRasterLayer = async (timestampId) => {
        
		timestampId = timestampId || '';
			
		if (map.getLayer('pred55')) {
			map.removeLayer('pred55'); // Rimuovi layer
			map.removeSource('pred55_source'); // Rimuovi la sorgente
		}
			
		const pred55 = await MapboxgljsEllipsis.AsyncEllipsisRasterLayer({
			pathId: "be1e61d7-f9c7-488c-985f-cd97f7e7a04b",
			timestampId: timestampId
		});
		pred55.id = 'pred55'; // Assegna un id al layer
		pred55.addTo(map);
	};
	
    // Slider change
	document.querySelector("#year_slider").addEventListener("calciteSliderChange", (e)=>{
		// console.log(e);
		let value = e.target.value;
		let selected_year = value.toString();
        let selected_timestampId = pred55_timestampIds.find(item => item.description === selected_year);
        clearPred55Selection()
        createEllipsisRasterLayer(selected_timestampId.id);
		if (marker) {
            const coords = marker.getLngLat();
            const { lng, lat } = coords;
            // console.log(lng, lat);
            analyseRaster(lng, lat, pred55_timestampIds, selected_year);
        }
	});
    
}

export { initMap, map, marker };