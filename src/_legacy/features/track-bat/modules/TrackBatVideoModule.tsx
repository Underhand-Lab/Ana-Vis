import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';

import { TrackBatData } from '../core/track-bat-data.ts';
import { useTrackBatFrame } from '../hooks/useTrackBatFrame';

import { exportVideo } from '@common/utils/exportVideo';

import CanvasRenderer, { CanvasRendererHandle }
from "@common/components/ui/react-web/custom/CanvasRenderer.tsx";
import { Div, Button, InputColor, InputNumber }
    from '@common/bridges/UIBridge.ts';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule }
    from '@common/types/analysis-module.ts';

export interface TrackBatSettings {
    batColor: string;
    trailColor: string;
    trailLen: number;
    [key: string]: any;
}

const defaultSettings: TrackBatSettings = {
    batColor: "rgba(255,128,0,0.4)", // Orange
    trailColor: "rgba(0,255,0,0.4)", // Green
    trailLen: 10
};

/**
 * 출력(View) 컴포넌트: 실제 캔버스 렌더링을 담당합니다.
 */
export const TrackBatVideoView: React.FC<AnalysisViewProps<TrackBatData, TrackBatSettings>> = ({ data, currentFrame, settings }) => {
    const rendererRef = useRef<CanvasRendererHandle>(null);
    
    // useTrackBatFrame 훅 호환성을 위한 가상 인터페이스
    const rendererInterface = useMemo(() => ({
        getCanvas: () => rendererRef.current?.getCanvas() || null
    }), []);

    const { setColors, setTrailLen, getTrailLayer } = useTrackBatFrame(data);

    // 설정 반영 후 그리기를 강제하기 위한 로컬 상태
    const [drawTick, setDrawTick] = useState(0);

    // 1. 설정값 동기화: 설정이 변경되면 훅의 상태를 업데이트하고 drawTick을 올려 다음 렌더링을 유도합니다.
    useEffect(() => {
        if (settings) {
            setColors((prev: any) => ({
                ...prev,
                batColor: settings.batColor,
                trailColor: settings.trailColor
            }));
            setTrailLen(settings.trailLen);
            // setTimeout(0)을 통해 hook 내부의 상태가 업데이트된 후 그리기가 발생하도록 함
            const timerId = setTimeout(() => setDrawTick(t => t + 1), 0);
            return () => clearTimeout(timerId);
        }
    }, [settings, setColors, setTrailLen]);

    // 원본 이미지와 레이어를 합성하는 함수 (useCallback으로 최적화)
    const drawImageAt = useCallback((frameIdx: number) => {
        if (!data) return null;

        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList ? rawImgList[frameIdx] : null;
        if (!backgroundImage) return null;

        const trailLayer = getTrailLayer(frameIdx);

        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(backgroundImage, 0, 0);
        if (trailLayer) {
            ctx.drawImage(trailLayer, 0, 0, backgroundImage.width, backgroundImage.height);
        }

        return compositeCanvas;
    }, [data, getTrailLayer]);

    // 2. 실제 그리기: data, frame 또는 drawTick(설정 변경 완료)이 바뀔 때 수행합니다.
    useEffect(() => {
        if (!data || !rendererRef.current) return;

        const composite = drawImageAt(currentFrame);
        if (composite) {
            rendererRef.current.updateLayout(composite.width, composite.height);
            rendererRef.current.drawImage(composite);
        }
    }, [data, currentFrame, drawTick, drawImageAt]);

    return (
        <Div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <CanvasRenderer 
                ref={rendererRef} 
                style={{ position: 'absolute', top: 0, left: 0 }} 
            />
        </Div>
    );
};

/**
 * 설정(Settings) 컴포넌트: 사용자 UI를 통한 설정 변경을 담당합니다.
 */
export const TrackBatVideoSettings: React.FC<AnalysisSettingsProps<TrackBatData, TrackBatSettings>> = ({ settings, onSettingsChange, data }) => {
    const [isExporting, setIsExporting] = useState(false);
    
    const { setColors, setTrailLen, getTrailLayer } = useTrackBatFrame(data);

    // settings 변경 시 useTrackBatFrame의 시각화 옵션 업데이트
    useEffect(() => {
        if (settings) {
            setColors((prev: any) => ({
                ...prev,
                batColor: settings.batColor,
                trailColor: settings.trailColor
            }));
            setTrailLen(settings.trailLen);
        }
    }, [settings, setColors, setTrailLen]);

    const drawImageAt = (frameIdx: number) => {
        if (!data) return null;
        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList ? rawImgList[frameIdx] : null;
        if (!backgroundImage) return null;

        const trailLayer = getTrailLayer(frameIdx);

        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(backgroundImage, 0, 0);
        if (trailLayer) {
            ctx.drawImage(trailLayer, 0, 0, backgroundImage.width, backgroundImage.height);
        }
        return compositeCanvas;
    };

    const handleExportVideo = async () => {
        if (!data || isExporting) return;
        setIsExporting(true);

        await exportVideo(drawImageAt, data.getFrameCnt(), {
            fps: data.getVideoMetadata(0)?.fps || 30,
            name: `track_bat_video_${Date.now()}.mp4`
        });

        setIsExporting(false);
    };

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <Button
                onClick={handleExportVideo}
                disabled={isExporting || !data}
                style={{ margin: 0, padding: '8px 15px', width: '100%', cursor: isExporting || !data ? 'not-allowed' : 'pointer' }}
            >
                {isExporting ? '저장 중...' : '비디오 저장'}
            </Button>
            <Div className="control-group">
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Trail Length: </label>
                <InputNumber
                    style={{ width: '60px' }} 
                    value={settings.trailLen}
                    max={data ? data.getFrameCnt() - 1 : 0}
                    onChange={(e) => onSettingsChange({ ...settings, trailLen: parseInt(e.target.value) })}
                />
            </Div>
            <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <InputColor
                    label="Bat Color" 
                    value={settings.batColor} 
                    onChange={(c) => onSettingsChange({ ...settings, batColor: c })} 
                />
                <InputColor
                    label="Trail Color" 
                    value={settings.trailColor} 
                    onChange={(c) => onSettingsChange({ ...settings, trailColor: c })} 
                />
            </Div>
        </Div>
    );
};

export const TrackBatVideoModule: AnalysisModule<TrackBatData, TrackBatSettings> = {
    id: 'track-bat-video',
    title: '동영상',
    View: TrackBatVideoView,
    Settings: TrackBatVideoSettings,
    defaultSettings
};

export default TrackBatVideoModule;