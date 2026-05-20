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
import { useTranslation } from 'react-i18next';
import vars from '@/common/components/ui-brick/variables';

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
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const customColorsRef = useRef<Record<string, string>>({});

    // 라벨 문자열을 기반으로 고유한 색상을 생성 (결정론적 방식)
    const getDeterministicColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const r = (hash & 0xFF0000) >> 16;
        const g = (hash & 0x00FF00) >> 8;
        const b = hash & 0x0000FF;
        return `rgba(${Math.abs(r % 255)}, ${Math.abs(g % 255)}, ${Math.abs(b % 255)}, 1)`;
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
                    legend: { 
                        display: false 
                    },
                    hideAfterIndex: { idx: idx }
                } as any,
                scales: {
                    x: { 
                        grid: { color: vars.surface }, // 텍스트 색상에 투명도(22) 추가
                        ticks: { color: vars.text }
                    },
                    y: { 
                        grid: { color: vars.surface },
                        ticks: { color: vars.text }
                    }
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
                customColorsRef.current[key] = getDeterministicColor(key);
            }
            const color = settings[key] || customColorsRef.current[key];
            const visibility = settings.datasetVisibility || {};
            const isVisible = visibility[key] !== false;

            datasets.push({
                label: t(`analysisLabels.${key}`, key),
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

    // 3. 인덱스 및 테마(vars) 변경 대응
    useEffect(() => {
        if (!chartRef.current) return;
        
        const chart = chartRef.current;
        
        // 비디오 재생 인덱스 업데이트
        (chart.options.plugins as any).hideAfterIndex.idx = idx;

        // 테마 변경에 따른 Chart.js 내부 색상(격자, 텍스트) 동적 업데이트
        if (chart.options.scales) {
            const { x, y } = chart.options.scales;
            if (x) {
                if (x.grid) x.grid.color = vars.surface; // 텍스트 색상에 투명도 추가
                if (x.ticks) x.ticks.color = vars.text;
            }
            if (y) {
                if (y.grid) y.grid.color = vars.surface;
                if (y.ticks) y.ticks.color = vars.text;
            }
        }

        chartRef.current.update('none');
    }, [idx, vars.box]);

    return (
        <div className={className} style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: 'transparent', // 다크모드 시 surface 색상 적용
            borderRadius: '8px',
            transition: 'background-color 0.3s ease'
        }}>
            <canvas ref={canvasRef} />
        </div>
    );
};

export default Graph;