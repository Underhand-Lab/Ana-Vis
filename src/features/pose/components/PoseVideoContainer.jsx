import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js"
import { usePoseVisualize } from "../hooks/usePoseVisualize.jsx"
import { exportVideo } from "../../../common/utils/exportVideo"

function PoseVideoContainer({ data, idx }) {
    // 1. 캔버스 및 렌더링 인스턴스 관리
    const canvasRef = useRef(null);
    const [isExporting, setIsExporting] = useState(false);
    const renderer = useMemo(() => new CanvasRenderer(), []);
    const { options, setOptions, getPoseLayer } = usePoseVisualize(data, renderer)

    // 3. 색상 변경 핸들러
    const handleColorChange = (key, value) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    };
    // 비디오 내보내기 로직
    const handleExportVideo = async () => {
        if (!data || isExporting) return;

        setIsExporting(true);

        await exportVideo(drawImageAt, data.getFrameCnt(), {
            fps: data.fps,
            name: `pose_video_${Date.now()}.mp4`
        });

        setIsExporting(false);

    };

    // 4. 데이터 초기화 및 레이아웃 설정
    useEffect(() => {
        if (!data || !canvasRef.current) return;

        renderer.setCanvas(canvasRef.current);

        const rawImgList = data.getRawImgList(0); // targetIdx가 0이라고 가정
        const firstImg = rawImgList[0];

        if (firstImg) {
            renderer.updateLayout(firstImg.width, firstImg.height);
        }
        const composite = drawImageAt(idx);
        if (composite && renderer) {
            renderer.updateLayout(composite.width, composite.height);
            renderer.drawImage(composite);
        }
    }, [data, renderer]);

    const drawImageAt = (frameIdx) => {
        if (!data) return null;

        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList[frameIdx];
        if (!backgroundImage) return null;

        // 포즈 레이어 생성
        const poseLayer = getPoseLayer(frameIdx);

        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const ctx = compositeCanvas.getContext('2d');

        // 합성: 배경 -> 포즈 스켈레톤
        ctx.drawImage(backgroundImage, 0, 0);
        if (poseLayer) {
            ctx.drawImage(poseLayer, 0, 0);
        }

        return compositeCanvas;
    };

    useEffect(() => {
        const composite = drawImageAt(idx);
        if (composite && renderer) {
            renderer.updateLayout(composite.width, composite.height);
            renderer.drawImage(composite);
        }
    }, [idx, renderer]);

    return (
        <div>

            {/* 메인 출력 캔버스 */}
            <canvas ref={canvasRef} style={{ flex: 1, background: 'black', width: '100%', height: '100%', position: 'absolute', top: 0 }} />

            <div className="grid-item-overlay setting frostedglassmorphism flex-view" style={{ top: '40px', right: 0, overflowY: 'auto', bottom: 0, padding: '20px' }}>

                <button
                    onClick={handleExportVideo}
                    disabled={isExporting}
                    style={{ width: '100%', cursor: isExporting ? 'not-allowed' : 'pointer' }}
                >
                    {isExporting ? '저장중..' : '저장하기'}
                </button>
                <div className="flex-view"
                    style={{ justifyContent: 'left' }}>
                    {Object.entries(colorMap).map(([key, label]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input
                                type="color"
                                value={options[key]}
                                onChange={(e) => handleColorChange(key, e.target.value)}
                            />
                            <span style={{ fontSize: '12px' }}>{label}</span>
                        </div>
                    ))}
                </div>
                {/* 
                <div style={{ textAlign: 'right' }}>
                    <button className="neumorphism-button" style={{ padding: '5px 15px' }} onClick={
                        async () => {
                            const blob = await frameMakerDataToBlob(frameMaker, frameMaker.data);
                            await saveBlobWithPicker(blob, "poseVideo.mp4", [{
                                description: 'Video File', accept: { 'video/mp4': ['.mp4'] }
                            }], true, "mp4");
                        }
                    }>SAVE</button>
                </div>
                */}
            </div>
        </div>
    );
}

// 매핑용 상수
const colorMap = {
    COLOR_LEFT_ARM: "L_ARM",
    COLOR_RIGHT_ARM: "R_ARM",
    COLOR_LEFT_LEG: "L_LEG",
    COLOR_RIGHT_LEG: "R_LEG",
    COLOR_TORSO: "BODY",
    COLOR_HEAD_NECK: "HEAD",
    JOINT_STROKE: "JOINT"
};

export default PoseVideoContainer;