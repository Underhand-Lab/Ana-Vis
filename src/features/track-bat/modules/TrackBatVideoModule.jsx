import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useTrackBatFrame } from '../hooks/useTrackBatFrame.jsx';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js";
import { exportVideo } from '../../../common/utils/exportVideo.jsx';
import { Div, Button, InputColor, InputNumber } from '../../../common/components/ui/UI.jsx';

const defaultSettings = {
    batColor: "rgba(255,128,0,0.4)", // Orange
    // batAlpha: 100, // Removed
    trailColor: "rgba(0,255,0,0.4)", // Green
    // trailAlpha: 100, // Removed
    trailLen: 10
};

/**
 * 출력(View) 컴포넌트
 */
export const TrackBatVideoView = ({ data, currentFrame, settings }) => {
    const canvasRef = useRef(null);
    const renderer = useMemo(() => new CanvasRenderer(), []);
    // TrackBatVideoContainer.jsx와 동일하게 data만 전달합니다.
    const { setColors, setTrailLen, getTrailLayer } = useTrackBatFrame(data);

    // 설정 반영 후 그리기를 강제하기 위한 로컬 상태
    const [drawTick, setDrawTick] = useState(0);

    // 렌더러에 캔버스 바인딩
    useEffect(() => {
        if (canvasRef.current) {
            renderer.setCanvas(canvasRef.current);
        }
    }, [renderer]);

    // 1. 설정값 동기화: 설정이 변경되면 훅의 상태를 업데이트하고 drawTick을 올려 다음 렌더링을 유도합니다.
    useEffect(() => {
        if (settings) {
            setColors({ batColor: settings.batColor, trailColor: settings.trailColor });
            setTrailLen(settings.trailLen);
            // setTimeout(0)을 통해 hook 내부의 상태가 업데이트된 후 그리기가 발생하도록 함
            const timerId = setTimeout(() => setDrawTick(t => t + 1), 0);
            return () => clearTimeout(timerId);
        }
    }, [settings, setColors, setTrailLen]);

    // 원본 이미지와 레이어를 합성하는 함수 (useCallback으로 최적화)
    const drawImageAt = useCallback((frameIdx) => { // eslint-disable-line react-hooks/exhaustive-deps
        if (!data) return null;

        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList ? rawImgList[frameIdx] : null;
        if (!backgroundImage) return null;

        const trailLayer = getTrailLayer(frameIdx);

        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');

        ctx.drawImage(backgroundImage, 0, 0);
        if (trailLayer) {
            ctx.drawImage(trailLayer, 0, 0, backgroundImage.width, backgroundImage.height);
        }

        return compositeCanvas;
    }, [data, getTrailLayer]);

    // 2. 실제 그리기: currentFrame 또는 drawTick(설정 변경 완료)이 바뀔 때 수행합니다.
    useEffect(() => {
        if (!data || !canvasRef.current) return;

        const composite = drawImageAt(currentFrame);
        if (composite && renderer) {
            renderer.updateLayout(composite.width, composite.height);
            renderer.drawImage(composite);
        }
    }, [data, currentFrame, drawTick, renderer]);

    return (
        <Div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: "100%", display: 'block', backgroundColor: 'black', position: 'absolute', top: 0 }} />
        </Div>
    );
};

/**
 * 설정(Settings) 컴포넌트
 */
export const TrackBatVideoSettings = ({ settings, onSettingsChange, data }) => {
    const [isExporting, setIsExporting] = useState(false);
    const renderer = useMemo(() => new CanvasRenderer(), []);
    // Settings 컴포넌트도 자체적으로 useTrackBatFrame 인스턴스를 가집니다.
    const { setColors, setTrailLen, getTrailLayer } = useTrackBatFrame(data);

    // settings 변경 시 useTrackBatFrame의 시각화 옵션 업데이트
    useEffect(() => {
        if (settings) {
            setColors({ batColor: settings.batColor, trailColor: settings.trailColor });
            setTrailLen(settings.trailLen);
        }
    }, [settings, setColors, setTrailLen]);

    const handleExportVideo = async () => {
        if (!data || isExporting) return;

        setIsExporting(true);

        const drawImageAt = (frameIdx) => {
            if (!data) return null;
            const rawImgList = data.getRawImgList(0);
            const backgroundImage = rawImgList ? rawImgList[frameIdx] : null;
            if (!backgroundImage) return null;

            const trailLayer = getTrailLayer(frameIdx);

            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = backgroundImage.width;
            compositeCanvas.height = backgroundImage.height;
            const ctx = compositeCanvas.getContext('2d');

            ctx.drawImage(backgroundImage, 0, 0);
            if (trailLayer) {
                ctx.drawImage(trailLayer, 0, 0, backgroundImage.width, backgroundImage.height);
            }
            return compositeCanvas;
        };

        await exportVideo(drawImageAt, data.getFrameCnt(), {
            fps: data.fps,
            name: `track_bat_video_${Date.now()}.mp4`
        });

        setIsExporting(false);
    };

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <Button
                onClick={handleExportVideo}
                disabled={isExporting || !data}
                style={{ width: '100%', cursor: isExporting || !data ? 'not-allowed' : 'pointer' }}
            >
                {isExporting ? '저장중..' : '비디오 저장'}
            </Button>
            {/* 궤적 길이 조절 */}
            <Div className="control-group">
                <label>Trail Length: </label>
                <InputNumber
                    pattern="\d*"
                    style={{ width: '60px' }} 
                    inputMode="decimal" step="1"
                    value={settings.trailLen}
                    max={data?.getFrameCnt() - 1 || 0}
                    onChange={(e) => onSettingsChange({ ...settings, trailLen: parseInt(e.target.value) })}
                />
            </Div>

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
    );
};

export const TrackBatVideoModule = {
    id: 'track-bat-video',
    title: '동영상',
    View: TrackBatVideoView,
    Settings: TrackBatVideoSettings,
    defaultSettings
};

export default TrackBatVideoModule;
