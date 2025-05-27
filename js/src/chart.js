import colormap55 from '../../assets/ct55.js';
import colormap1600 from '../../assets/ct1600.js';

let myChart;
const drawChart = (data, year) => {
	
	// Crea una lookup Map da valore a colore
	const colorMap55 = new Map(
		colormap55.map(entry => [entry.value, entry.target.color])
	);

	const colorMap1600 = new Map(
		colormap1600.map(entry => [entry.value, entry.target.color])
	);

	let colorMap;
	// Seleziona la colormap in base al raster selezionato
	let selected_raster = document.querySelector("#pred_combobox").value;
	if (selected_raster === 'be1e61d7-f9c7-488c-985f-cd97f7e7a04b') {
		// Colormap 55
		colorMap = colorMap55;
	} else if (selected_raster === '1d215c20-45e1-4e9f-b9d3-df66134586b3') {
		// Colormap 1600
		colorMap = colorMap1600;
	}


	let chartData = data.map(item => item.result[0].statistics.mean);
	let years = ['2018', '2019', '2020', '2021', '2022', '2023', '2024'];
	// let year_index = years.indexOf(year.toString());

	// console.log(year, year_index)
			
	myChart = echarts.init(document.getElementById('chart-container'));
	var option = {
		tooltip: {
			trigger: 'axis',
				axisPointer: {
					type: 'shadow' // 'line', 'shadow', 'none', 'cross'
			}
		},
		xAxis: {
			name: 'Year',
			data: years
		},
		yAxis: {
			name: 'Ecoregion Class',
			nameLocation: 'center',   // 👈 posizione centrata rispetto all’asse
			nameRotate: 270,          // 👈 verticale, lettura top-to-bottom
			nameGap: 35,              // 👈 distanza dalla scala
			type: 'value',
			// min: 0,
  			// max: 55,
			// interval: 5, // Intervallo tra le tacche
			axisLabel: { show: false },  // ❌ niente numeri
			axisTick: { show: false },   // ❌ niente tacche
			// splitLine: { show: false }   // ❌ niente linee orizzontali
		},

		series: [{
			name: 'Ecoregion',
			type: 'scatter',
			data: chartData,
            // symbolSize: (value, params) => params.dataIndex === year_index ? 14 : 8,
			symbolSize: 8, // Dimensione dei punti
			// symbol: 'circle', // Forma dei punti
            itemStyle: {
                color: (params) => {
					const value = Math.round(params.value);
					return colorMap.get(value) || '#ccc';
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