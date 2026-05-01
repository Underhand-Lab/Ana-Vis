import React, { useEffect, useRef } from 'react';
import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Legend,
    Tooltip,
    ChartDataset,
    Plugin
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

interface HideAfterIndexOptions {
    idx: number;
}

/**
 * 특정 인덱스 이후의 데이터를 숨기는 Chart.js 플러그인
 */
const hideAfterIndexPlugin: Plugin<'line'> = {
    id: 'hideAfterIndex',
    beforeDatasetDraw(chart, args, options) {
        const { idx } = options as HideAfterIndexOptions;
        const datasetIndex = args.index;
        const dataArr = chart.data.datasets[datasetIndex].data;

        args.meta.data.forEach((point: any, i: number) => {
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

interface GraphProps {
    data: Record<string, (number | null)[]> | null;
    idx: number;
    settings?: {
        lineWidth?: number;
        datasetVisibility?: Record<string, boolean>;
        [key: string]: any; // 개별 데이터셋 키에 따른 색상 값 (예: { key1: 'red' })
    };
    className?: string;
}

const Graph: React.FC<GraphProps> = ({ data, idx, settings = {}, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const customColorsRef = useRef<Record<string, string>>({});

    const getRandomColor = () => {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r}, ${g}, ${b}, 1)`;
    };

    // 1. 차트 초기 생성 및 정리
    useEffect(() => {
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        Chart.defaults.font.family = "'KBO-Dia-Gothic_medium', 'Arial', 'sans-serif'";

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    hideAfterIndex: { idx: idx }
                } as any,
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.1)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.1)' } }
                }
            },
            plugins: [hideAfterIndexPlugin]
        });

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, []);

    // 2. 데이터 및 설정(색상, 가시성 등) 업데이트
    useEffect(() => {
        if (!chartRef.current || !data) return;

        let maxLen = 0;
        const datasets: ChartDataset<'line'>[] = [];

        for (const key in data) {
            if (!customColorsRef.current[key]) {
                customColorsRef.current[key] = getRandomColor();
            }
            const color = settings[key] || customColorsRef.current[key];
            const visibility = settings.datasetVisibility || {};
            const isVisible = visibility[key] !== false;

            datasets.push({
                label: key,
                data: data[key] as any,
                borderColor: color,
                backgroundColor: color,
                hidden: !isVisible,
                borderWidth: settings.lineWidth || 3,
                pointRadius: 0,
                tension: 0.2
            });
            if (data[key].length > maxLen) maxLen = data[key].length;
        }

        const labels = Array.from({ length: maxLen }, (_, i) => i.toString());

        chartRef.current.data.labels = labels;
        chartRef.current.data.datasets = datasets;
        chartRef.current.update('none');
    }, [data, settings]);

    // 3. 인덱스 변경 시 (비디오 재생/탐색 대응) 플러그인 옵션 업데이트
    useEffect(() => {
        if (!chartRef.current) return;
        (chartRef.current.options.plugins as any).hideAfterIndex.idx = idx;
        chartRef.current.update('none');
    }, [idx]);

    return (
        <div className={className} style={{ width: '100%', height: '100%' }}>
            <canvas ref={canvasRef} />
        </div>
    );
};

export default Graph;