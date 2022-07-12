let chart;
let refs = new Set();
let stats;
let ref;
let interval;
let downloadType;
let min = null;
let arch1 = 'x86_64';
let arch2 = 'aarch64';
let color1 = 'DodgerBlue';
let color2 = 'Orange';
let dma = 30;
let ma1= 0;
let ma2= 0;
let lastDate;

function initChart() {
	let ctx = document.getElementById("chart").getContext("2d");
	chart = new Chart(ctx, {
		data: {
			datasets: [
				{
					type: 'bar',
					label: arch1,
					backgroundColor: Chart.helpers.color(color1).alpha(0.66).rgbString(),
					barPercentage: 1,
					data: [],
					hoverBorderColor: 'Red',
					hoverBorderWidth: 1,
					order: 1,
				},
				{
					type: 'bar',
					label: arch2,
					backgroundColor: Chart.helpers.color(color2).alpha(0.66).rgbString(),
					barPercentage: 1,
					data: [],
					hoverBorderColor: 'Red',
					hoverBorderWidth: 1,
					order: 1,
				},
				{
					type: 'line',
					label: arch1 + ' (Moving Average)',
					backgroundColor: 'White',
					borderColor: color1,
					borderWidth: 3,
					pointRadius: 0,
					cubicInterpolationMode: 'monotone',
					data: [],
					order: 0,
				},
				{
					type: 'line',
					label: arch2 + ' (Moving Average)',
					backgroundColor: 'White',
					borderColor: color2,
					borderWidth: 3,
					pointRadius: 0,
					cubicInterpolationMode: 'monotone',
					data: [],
					order: 0,
				},
			],
		},
		options: {
			scales: {
				x: {
					type: "time",
					time: {
						minUnit: "day",
					}
				},
				y: {
					beginAtZero: true
				}
			},
			tooltips: {
				mode: "x",
				intersect: false
			}
		}
	});
}

function updateBasicStats() {
	let ma = ma1 + ma2;
	document.getElementById("basic-stats").textContent = `Last data: ${lastDate.toDateString()} | ${dma}-day-average: ${ma.toFixed(1)} ${downloadType} per day`;
}

function updateDatasets() {
	chart.data.datasets[0].data = [];
	chart.data.datasets[1].data = [];
	chart.data.datasets[2].data = [];
	chart.data.datasets[3].data = [];
	let dl = 0;
	let dl1 = 0;
	let dl2 = 0;
	let dl1_ = 0;
	let dl2_ = 0;
	let date;

	for (let dataPoint of stats) {
		for (let arch of Object.keys(dataPoint.arches)) {
			date = new Date(dataPoint.date);
			dl = 0;

			switch (downloadType) {
				case "installs+updates":
					dl = dataPoint.arches[arch][0];
					break;
				case "installs":
					dl = dataPoint.arches[arch][0] - dataPoint.arches[arch][1];
					break;
				case "updates":
					dl = dataPoint.arches[arch][1];
					break;
			}

			switch (arch) {
				case arch1:
					dl1 = dl;
					break;
				case arch2:
					dl2 = dl;
					break;
				}
		}

		chart.data.datasets[0].data.push({
			x: date,
			y: dl1,
		});
		chart.data.datasets[1].data.push({
			x: date,
			y: dl2
		});

		dl1_ = 0;
		dl2_ = 0;
		let n = chart.data.datasets[0].data.length - 1;
		let m = 0;

		for (let i = 0; i < dma; i++) {
			if (n - i >= 0) {
				dl1_ += chart.data.datasets[0].data[n - i].y;
				dl2_ += chart.data.datasets[1].data[n - i].y;
				m = i + 1;
			}
		}

		if (m === dma) {
			chart.data.datasets[2].data.push({
				x: date,
				y: dl1_ / dma,
			});
			chart.data.datasets[3].data.push({
				x: date,
				y: dl2_ / dma,
			});	
		}
	}
	ma1 = dl1_ / dma;
	ma2 = dl2_ / dma;
	lastDate = date;
	chart.update();
	updateBasicStats();
}

function updateURL() {
	window.location.hash = `#ref=${ref}&interval=${interval}&downloadType=` + encodeURIComponent(downloadType);
}

async function refHandler(event) {
	let refEventValue = event.target.value;
	if (!refs.has(refEventValue)) {
		return;
	}
	ref = refEventValue;
	let response = await fetch(`./data/${ref.replace("/", "_")}.json`);
	let json = await response.json();

	stats = json.stats;
	updateDatasets();
	updateURL();
}

function intervalHandler() {
	interval = event.target.value;
	if (interval === "infinity") {
		delete chart.options.scales.x.min;
		min = null;
	} else {
		min = new Date();
		min.setDate(min.getDate() - interval);
		chart.options.scales.x.min = min;
	}
	chart.update();
	updateBasicStats();
	updateURL();
}

function downloadTypeHandler() {
	downloadType = event.target.value;
	updateDatasets();
	updateURL();
}

async function init() {
	initChart();

	let response = await fetch("./data/refs.json");
	let json = await response.json();
	json.forEach(ref => refs.add(ref));
	let refsElement = document.getElementById("refs");

	for (let ref of refs.keys()) {
		let option = document.createElement("option");
		option.value = ref;
		refsElement.append(option);
	}

	let refElement = document.getElementById("ref");
	let intervalSelectElement = document.getElementById("interval-select");
	let downloadTypeElement = document.getElementById("downloadType");
	let params = new URLSearchParams(window.location.hash.substring(1));

	refElement.value = params.has("ref") ? params.get("ref") : refsElement.childNodes[0].value;
	if (params.has("interval")) {
		intervalSelectElement.value = params.get("interval");
	}
	interval = intervalSelectElement.value;
	if (params.has("downloadType")) {
		downloadTypeElement.value = params.get("downloadType");
	}
	downloadType = downloadTypeElement.value;

	refElement.addEventListener("change", refHandler);
	intervalSelectElement.addEventListener("change", intervalHandler);
	downloadTypeElement.addEventListener("change", downloadTypeHandler);

	await refHandler({target: {value: refElement.value}});
	intervalSelectElement.dispatchEvent(new Event("change"));
	downloadTypeElement.dispatchEvent(new Event("change"));
}

window.addEventListener("DOMContentLoaded", init);
