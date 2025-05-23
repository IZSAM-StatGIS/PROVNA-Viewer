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
		yAxis: {},
		series: [{
			name: 'Cluster',
			type: 'line',
			data: chartData,
            // symbolSize: (value, params) => params.dataIndex === year_index ? 14 : 8,
			symbolSize: 6, // Dimensione dei punti
            lineStyle: {
                width: 4,         // Spessore della linea
                color: '#39BEBA'  // Colore della linea
            },
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