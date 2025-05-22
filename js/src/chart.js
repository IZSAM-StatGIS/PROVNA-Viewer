let myChart;
const drawChart = (data) => {
			
	let chartData = data.map(item => item.result[0].statistics.mean);
	// console.log(chartData)
			
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
			data: ['2018', '2019', '2020', '2021', '2022', '2023', '2024']
		},
		yAxis: {},
		series: [{
			name: 'Cluster',
			type: 'line',
			data: chartData,
            symbolSize: 10,
            lineStyle: {
                width: 4,         // Spessore della linea
                color: '#39BEBA'  // Colore della linea
            },
            itemStyle: {
                color: '#39BEBA'  // Colore dei punti
            }
		}]
	};

	// Compone il grafico con le opzioni definite
	myChart.setOption(option);
};

export { drawChart, myChart };