import React, { useEffect, useRef, useCallback } from 'react';
import { CVValData } from "@common/core/cvval-data";
import { IVideoStrategy } from "@common/types/video-strategy";
import CanvasRenderer, { CanvasRendererHandle } from "@common/components/ui/react-web/custom/CanvasRenderer.tsx";
import { Div } from '@common/bridges/UIBridge.ts';

interface VideoModuleProps {
    cvValData: CVValData;
    currentFrame: number;
    strategies: IVideoStrategy[];
    settings: Record<string, any>; // 각 전략별 설정 맵 (e.g., { pose: { color: 'red' }, bat: { ... } })
}

/**
 * 통합 비디오 모듈: 여러 분석 결과를 하나의 캔버스에 중첩하여 렌더링합니다.
 */
export const VideoModule: React.FC<VideoModuleProps> = ({ 
    cvValData, 
    currentFrame, 
    strategies, 
    settings 
}) => {
    const rendererRef = useRef<CanvasRendererHandle>(null);

    const renderFrame = useCallback(() => {
        if (!rendererRef.current) return;

        // 1. 배경 이미지 찾기 (데이터가 존재하는 첫 번째 소스에서 이미지를 가져옴)
        let backgroundImage: HTMLImageElement | HTMLCanvasElement | null = null;
        const activeTypes = strategies.map(s => s.type);
        
        for (const type of activeTypes) {
            const data = cvValData.get(type);
            if (data && typeof data.getRawImgList === 'function') {
                backgroundImage = data.getRawImgList(0)?.[currentFrame];
                if (backgroundImage) break;
            }
        }

        if (!backgroundImage) return;

        // 2. 오프스크린 캔버스에 합성
        const canvas = document.createElement('canvas');
        canvas.width = backgroundImage.width;
        canvas.height = backgroundImage.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 배경 그리기 (설정에 따라 배경을 숨길 수 있음)
        const showBackground = settings.global?.showBackground !== false;
        if (showBackground) {
            ctx.drawImage(backgroundImage, 0, 0);
        } else {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 3. 전략 패턴을 이용한 레이어 추가 (Strategy Execution)
        strategies.forEach(strategy => {
            if (cvValData.exist(strategy.type)) {
                const data = cvValData.get(strategy.type);
                const strategySettings = settings[strategy.type] || {};
                strategy.draw(ctx, data, currentFrame, strategySettings);
            }
        });

        // 4. 최종 결과 출력
        rendererRef.current.updateLayout(canvas.width, canvas.height);
        rendererRef.current.drawImage(canvas);
    }, [cvValData, currentFrame, strategies, settings]);

    useEffect(() => {
        renderFrame();
    }, [renderFrame]);

    return (
        <Div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <CanvasRenderer 
                ref={rendererRef} 
                style={{ position: 'absolute', top: 0, left: 0 }} 
            />
        </Div>
    );
};