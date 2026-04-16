import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale, // 오류의 원인인 category 스케일
    Legend,
    Tooltip
} from 'chart.js';

// 필요한 구성 요소 등록
Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Legend,
    Tooltip
);

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
        this.customColors = {};
        Chart.defaults.font.family = 'KBO-Dia-Gothic_medium', 'Arial', 'sans-serif';
    }
    setCanvas(canvas) {
        this.canvas = canvas;
    }

    getRandomColor() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r}, ${g}, ${b}, 1)`;
    }

    // 데이터셋 생성 (settings에서 색상 및 기타 옵션 적용)
    getDataSet(settings = {}) {
        if (!this.data) return [[], []];

        let maxLen = 0;
        const datasets = [];
        for (let key in this.data) {
            // 1. settings에 설정된 색상 사용
            // 2. 없으면 기존에 할당된 커스텀(랜덤) 색상 사용
            // 3. 둘 다 없으면 새로운 랜덤 색상 생성 후 저장
            if (!this.customColors[key]) this.customColors[key] = this.getRandomColor();
            const color = settings[key] || this.customColors[key];
            
            const visibility = settings.datasetVisibility || {};
            const isVisible = visibility[key] !== false;

            datasets.push({
                label: key,
                data: this.data[key],
                borderColor: color,
                backgroundColor: color,
                hidden: !isVisible, // 초기 가시성 설정
                borderWidth: settings.lineWidth || 3, // 선 굵기 적용
                pointRadius: 0,
                tension: 0.2 // 곡선미 살짝 추가
            });
            if (this.data[key].length > maxLen) maxLen = this.data[key].length;
        }

        const labels = Array.from({ length: maxLen }, (_, i) => i);
        return [datasets, labels];
    }

    // 차트 초기화 및 업데이트
    setDefault(idx = 0, settings = {}) {
        const ctx = this.canvas.getContext('2d');
        if (this.chart) this.chart.destroy();

        const [datasets, labels] = this.getDataSet(settings); // settings를 getDataSet에 전달

        this.chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
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

    // 범례를 React에서 관리하므로, 이 함수는 제거됩니다.
    // renderCustomLegend(container) { ... }

    // 외부에서 데이터셋 가시성을 제어할 수 있는 메서드
    setDatasetVisibility(index, visible) {
        if (this.chart && this.chart.data.datasets[index]) {
            this.chart.setDatasetVisibility(index, visible);
            this.chart.update();
        }
    }

    // 외부에서 데이터셋 가시성 상태를 확인할 수 있는 메서드
    isDatasetVisible(index) {
        if (this.chart && this.chart.data.datasets[index]) {
            return this.chart.isDatasetVisible(index);
        }
        return false; // 차트가 없거나 데이터셋이 없으면 false 반환
    }

    setData(data, settings = {}) {
        
        this.data = data;
        const [datasets, labels] = this.getDataSet(settings); // settings를 getDataSet에 전달
        
        if (this.chart) {
            // 레이블 업데이트
            this.chart.data.labels = labels;
            
            // 기존 데이터셋 인스턴스를 유지하면서 속성만 업데이트 (색상 반영 보장)
            const existingDatasets = this.chart.data.datasets;
            const updatedDatasets = datasets.map((newDs) => {
                const existing = existingDatasets.find(d => d.label === newDs.label);
                if (existing) {
                    // 기존 객체에 새로운 데이터와 스타일(색상, 가시성 등)을 복사
                    Object.assign(existing, newDs);
                    return existing;
                }
                return newDs;
            });

            this.chart.data.datasets.splice(0, existingDatasets.length, ...updatedDatasets); // 배열 내용 업데이트
            
            this.chart.update('none'); // 애니메이션 없이 즉시 업데이트
        } else {
            // 차트가 아직 초기화되지 않았다면, settings를 사용하여 초기화
            this.setDefault(0, settings); // settings를 setDefault에 전달
        }
    }

    drawImageAt(idx) {
        if (!this.chart) return;
        this.chart.options.plugins.hideAfterIndex.idx = idx;
        this.chart.update('none'); // 성능을 위해 애니메이션 없이 업데이트
    }
}