import colormap94 from '../../assets/ct94_full.js';
import colormap3600 from '../../assets/ct3600.js';

let myChart;
const drawChart = (data, year, timestamps = []) => {
	const extractTimestampYear = (timestamp) => {
		const raw = String(timestamp?.description ?? "").trim();
		const direct = Number(raw);
		if (Number.isInteger(direct) && direct >= 1900 && direct <= 2100) {
			return String(direct);
		}
		const match = raw.match(/\b(19|20)\d{2}\b/);
		return match ? match[0] : null;
	};
	
	// Crea una lookup Map da valore a colore
	const colorMap94 = new Map(
		colormap94.map(entry => [entry.value, { color: entry.target.color, exemplar: entry.exemplar }])
	);

	const colorMap3600 = new Map(
		colormap3600.map(entry => [entry.value, { color: entry.target.color }])
	);

	let colorMap;
	// Seleziona la colormap in base al raster selezionato
	let selected_raster = document.querySelector("#pred_combobox").value;
	if (selected_raster === '130cddc5-ce47-45b2-abfe-0961e3e597cd') {
		// Colormap 94
		colorMap = colorMap94;
	} else {
		// Colormap 3600
		colorMap = colorMap3600;
	}

	const timeline = timestamps
		.map(item => ({
			id: item.id,
			year: extractTimestampYear(item)
		}))
		.filter(item => Boolean(item.year))
		.sort((a, b) => Number(a.year) - Number(b.year));

	const valuesByTimestampId = new Map(
		data.map(item => [item.timestamp.id, item.result?.[0]?.statistics?.mean ?? null])
	);

	const years = timeline.map(item => item.year);
	const chartData = timeline.map(item => valuesByTimestampId.get(item.id) ?? null);
	// let year_index = years.indexOf(year.toString());

	// console.log(year, year_index)
			
	myChart = echarts.init(document.getElementById('chart-container'));
	var option = {
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'shadow' // 'line', 'shadow', 'none', 'cross'
			},
			formatter: (params) => {
				const point = Array.isArray(params) ? params[0] : params;
				const value = Math.round(point.value);
				const meta = colorMap.get(value);
				const exemplar = meta && meta.exemplar ? meta.exemplar : null;
				return exemplar ? `Ecoregion: ${value}<br/>Exemplar: ${exemplar}` : `Ecoregion: ${value}`;
			}
		},
		xAxis: {
			name: 'Year',
			data: years
		},
		yAxis: {
			name: 'Ecoregion',
			nameLocation: 'center',   	// 👈 posizione centrata rispetto all’asse
			nameRotate: 90,          	// 👈 verticale, lettura top-to-bottom
			nameGap: 25,              	// 👈 distanza dalla scala
			type: 'value',
			// min: 0,
  			// max: 55,
			// interval: 5, // Intervallo tra le tacche
			axisLabel: { show: false },  // ❌ niente numeri
			axisTick: { show: false },   // ❌ niente tacche
			// splitLine: { show: false }   // ❌ niente linee orizzontali
		},
		grid: {
            left: '8%', right: '10%', top: '10%', bottom: '10%'
        },
		series: [{
			name: 'Ecoregion',
			type: 'scatter',
			data: chartData,
            // symbolSize: (value, params) => params.dataIndex === year_index ? 14 : 8,
			symbolSize: 24, // Dimensione dei punti
			// symbol: 'circle', // Forma dei punti
            itemStyle: {
                color: (params) => {
					const value = Math.round(params.value);
					const meta = colorMap.get(value);
					return (meta && meta.color) || '#ccc';
				}
            },
			markLine: {
        		symbol: 'none',  // ❌ niente frecce alle estremità
				label: {
					show: true,
					formatter: year.toString(),
					position: 'insideTop',
					color: 'blue'
				},
				lineStyle: {
					color: '#007ac2',
					type: 'dashed',
					width: 2
				},
				data: [
					{ xAxis: year.toString() }  // 🎯 posizione verticale sull’anno 
				]
			}
		}]
	};

	// Compone il grafico con le opzioni definite
	myChart.setOption(option);
};

export { drawChart, myChart };
