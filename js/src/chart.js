let myChart;
const drawChart = (data, year) => {
			
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
                color: '#39BEBA'  // Colore dei punti
				// color: (params) => params.dataIndex === year_index ? '#007ac2' : '#39BEBA'
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