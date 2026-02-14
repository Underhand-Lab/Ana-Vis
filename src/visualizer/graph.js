const hideAfterIndexPlugin = {
    id: 'hideAfterIndex',
    beforeDatasetDraw(chart, args, options) {
        const { idx } = options;
        const datasetIndex = args.index;
        const dataArr = chart.data.datasets[datasetIndex].data;

        args.meta.data.forEach((point, i) => {
            const rawVal = dataArr[i];
            const isNull = rawVal === null || rawVal === undefined;
            if (i > idx || isNull) {
                point.skip = true;
            } else {
                point.skip = false;
            }
        });
    }
};

export class GraphVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.chart = null;
        this.data = null;
        this.customColors = {}; // 관절명: 색상 매핑
        Chart.defaults.font.family = 'KBO-Dia-Gothic_medium', 'Arial', 'sans-serif';
    }

    // 데이터셋 생성 (저장된 색상 우선 적용)
    getDataSet() {
        if (!this.data) return [[], []];

        let maxLen = 0;
        const datasets = [];

        for (let key in this.data) {
            const color = this.customColors[key] || getRandomColor();
            this.customColors[key] = color; // 색상 고정

            datasets.push({
                label: key,
                data: this.data[key],
                borderColor: color,
                backgroundColor: color,
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.2 // 곡선미 살짝 추가
            });
            if (this.data[key].length > maxLen) maxLen = this.data[key].length;
        }

        const labels = Array.from({ length: maxLen }, (_, i) => i);
        return [datasets, labels];
    }

    // 차트 초기화 및 업데이트
    setDefault(idx = 0) {
        const ctx = this.canvas.getContext('2d');
        if (this.chart) this.chart.destroy();

        const [datasets, labels] = this.getDataSet();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                animation: false,
                responsive: true,
                plugins: {
                    legend: { display: false }, // 내장 범례 숨김
                    hideAfterIndex: { idx: idx }
                },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.1)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.1)' } }
                }
            },
            plugins: [hideAfterIndexPlugin]
        });
    }

    renderCustomLegend(container) {
        if (!container || !this.chart) return;
        container.innerHTML = "";

        this.chart.data.datasets.forEach((dataset, index) => {
            const wrapper = document.createElement("div");
            wrapper.style["text-wrap"] = "nowrap";
            wrapper.style.display = "inline-block";

            function rgb2Hex(_rgbColor) {
                let rgbNums = _rgbColor.match(/rgb[a]{0,1}\((\d+)\,[\s]{0,}(\d+)\,[\s]{0,}(\d+)/);
                if (rgbNums != null) {
                    let _hexColor = "#";
                    for (let i = 1; i <= 3; i++) _hexColor += parseInt(rgbNums[i]).toString(16);
                    return _hexColor.toUpperCase();
                }
                else return _rgbColor;
            }


            // 1. 투박한 색상 선택 상자 (의도하신 대로 노출)
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = rgb2Hex(dataset.borderColor);
            colorInput.className = "visible-color-input";

            // 2. 메인 버튼 (On/Off 토글용)
            const toggleBtn = document.createElement("label");
            toggleBtn.className = "legend-btn";
            if (!this.chart.isDatasetVisible(index)) toggleBtn.classList.add("is-hidden");

            toggleBtn.innerHTML = `
            <span class="label-text"><e-text key="${dataset.label}"></span>
        `;

            // 색상 변경 로직
            colorInput.onchange = (e) => {
                const newColor = e.target.value;
                const currentLabel = dataset.label; // dataset 객체에서 직접 참조

                this.customColors[currentLabel] = newColor;
                this.chart.data.datasets[index].borderColor = newColor;
                this.chart.data.datasets[index].backgroundColor = newColor;

                this.chart.update();
            };

            // 토글 버튼 클릭 로직
            toggleBtn.onclick = () => {
                const isVisible = this.chart.isDatasetVisible(index);
                this.chart.setDatasetVisibility(index, !isVisible);
                toggleBtn.classList.toggle("is-hidden", isVisible);
                toggleBtn.style["text-decoration"] = isVisible ? "line-through" : null;
                this.chart.update();
            };

            // 순서대로 추가: 색상상자 + 토글버튼
            wrapper.appendChild(colorInput);
            wrapper.appendChild(toggleBtn);
            container.appendChild(wrapper);
        });
    }

    openColorPicker(label, index, btnElement) {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = this.chart.data.datasets[index].borderColor;

        input.onchange = (e) => {
            const newColor = e.target.value;
            this.customColors[label] = newColor;
            this.chart.data.datasets[index].borderColor = newColor;
            this.chart.data.datasets[index].backgroundColor = newColor;

            // 버튼 아이콘 색상도 즉시 변경
            btnElement.querySelector('.color-chip').style.background = newColor;
            this.chart.update();
        };
        input.click();
    }

    setData(data, legendContainer) {
        this.data = data;
        const [datasets, labels] = this.getDataSet();

        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets = datasets;
            this.chart.update();
            if (legendContainer) this.renderCustomLegend(legendContainer);
        }
    }

    drawImageAt(idx) {
        if (!this.chart) return;
        this.chart.options.plugins.hideAfterIndex.idx = idx;
        this.chart.update('none'); // 성능을 위해 애니메이션 없이 업데이트
    }
}

function getRandomColor() {
    const r = Math.floor(Math.random() * 200 + 55); // 너무 어둡지 않게
    const g = Math.floor(Math.random() * 200 + 55);
    const b = Math.floor(Math.random() * 200 + 55);
    return `rgb(${r}, ${g}, ${b})`;
}