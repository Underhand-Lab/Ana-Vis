import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js"
import { PoseVisualizer } from "../../../lib/cv-val-visualizer/pose/pose-visualizer.js"

function PoseVideoContainer({ data, idx }) {
    // 1. 캔버스 및 렌더링 인스턴스 관리
    const canvasRef = useRef(null);
    const renderer = useMemo(() => new CanvasRenderer(), []);
    const visualizer = useMemo(() => new PoseVisualizer(), []);

    // 오프스크린 캔버스 (합성용)
    const offscreenRef = useRef(document.createElement('canvas'));

    // 2. 색상 상태 관리 (기본값 설정)
    const [colors, setColors] = useState({
        COLOR_LEFT_ARM: "#ff0000",
        COLOR_RIGHT_ARM: "#0000ff",
        COLOR_LEFT_LEG: "#ffff00",
        COLOR_RIGHT_LEG: "#00ffff",
        COLOR_TORSO: "#00ff00",
        COLOR_HEAD_NECK: "#ffffff",
        JOINT_STROKE: "#ff0000"
    });

    // 3. 색상 변경 핸들러
    const handleColorChange = (key, value) => {
        setColors(prev => ({ ...prev, [key]: value }));
        visualizer.setColor(key, value);
    };

    // 4. 데이터 초기화 및 레이아웃 설정
    useEffect(() => {
        console.log(data);
        if (!data || !canvasRef.current) return;

        renderer.setCanvas(canvasRef.current);

        const rawImgList = data.getRawImgList(0); // targetIdx가 0이라고 가정
        const firstImg = rawImgList[0];

        if (firstImg) {
            renderer.updateLayout(firstImg.width, firstImg.height);
            offscreenRef.current.width = firstImg.width;
            offscreenRef.current.height = firstImg.height;
        }
    }, [data, renderer]);

    // 5. 프레임 그리기 로직 (idx나 colors가 바뀔 때마다 실행)
    useEffect(() => {
        if (!data || !canvasRef.current) return;

        const targetIdx = 0; // 컴포넌트 내부 설정값
        const rawImgList = data.getRawImgList(targetIdx);
        const landmark2dList = data.getLandmarks2dList(targetIdx);

        const backgroundImage = rawImgList[idx];
        const landmarks = landmark2dList[idx];

        if (!backgroundImage) return;

        const offCanvas = offscreenRef.current;
        const offCtx = offCanvas.getContext('2d');
        const { width, height } = offCanvas;

        // 합성 그리기
        offCtx.clearRect(0, 0, width, height);
        offCtx.drawImage(backgroundImage, 0, 0, width, height);
        if (landmarks) {
            visualizer.draw(offCtx, landmarks, width, height);
        }

        // 메인 캔버스에 출력
        renderer.drawImage(offCanvas);
    }, [idx, data, colors, renderer, visualizer]);

    return (
        <div>

            {/* 메인 출력 캔버스 */}
            <canvas ref={canvasRef} style={{ flex: 1, background: 'black', width: '100%', height: '100%', position: 'absolute', top: 0 }} />
            <div className="grid-item-overlay setting frostedglassmorphism flex-view" style={{ top: '40px', right: 0, overflowY: 'auto', bottom: 0, padding: '20px' }}>

                <div className="flex-view"
                    style={{ justifyContent: 'left' }}>
                    {Object.entries(colorMap).map(([key, label]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input
                                type="color"
                                value={colors[key]}
                                onChange={(e) => handleColorChange(key, e.target.value)}
                            />
                            <span style={{ fontSize: '12px' }}>{label}</span>
                        </div>
                    ))}
                </div>
                {/*
                        <div style={{ textAlign: 'right' }}>
                            <button className="neumorphism-button" style={{ padding: '5px 15px' }} onClick={
                                async () => {const blob = await frameMakerDataToBlob(frameMaker, frameMaker.data);
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