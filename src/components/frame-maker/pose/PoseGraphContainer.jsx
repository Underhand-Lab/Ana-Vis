import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GraphVisualizer } from "../../../lib/visualizer/graph.js";

function PoseGraphContainer({ data, idx, analysisTools }) {
    const canvasRef = useRef(null);
    const legendRef = useRef(null);
    
    // 1. 분석 도구 상태 관리 (기본값: angle)
    const [selectedToolKey, setSelectedToolKey] = useState("angle");

    // 2. 비주얼라이저 인스턴스 생성 및 고정
    const visualizer = useMemo(() => {
        return new GraphVisualizer();
    }, []);

    // 3. 분석 도구 변경 핸들러
    const handleToolChange = (e) => {
        setSelectedToolKey(e.target.value);
    };

    // 4. 초기 설정 및 캔버스 연결
    useEffect(() => {
        if (!canvasRef.current) return;
        
        visualizer.setCanvas(canvasRef.current);
        visualizer.setDefault();
    }, [visualizer]);

    // 5. 데이터 프로세싱 (데이터가 바뀌거나 분석 도구가 바뀔 때)
    useEffect(() => {
        if (!data || !analysisTools) return;

        console.log(data);

        const currentTool = analysisTools[selectedToolKey];
        // 분석 도구가 있으면 계산된 데이터를, 없으면 원본 데이터를 사용
        const graphData = currentTool ? currentTool.calc(data) : data;

        // 데이터와 범례 컨테이너를 비주얼라이저에 전달
        visualizer.setData(graphData, legendRef.current);
        
        // 데이터가 업데이트된 후 현재 인덱스에 맞춰 다시 그리기
        visualizer.drawImageAt(idx);
    }, [data, selectedToolKey, analysisTools, visualizer]);

    // 6. 인덱스(슬라이더) 변경 시 드로잉
    useEffect(() => {
        if (!data) return;
        visualizer.drawImageAt(idx);
    }, [idx, data, visualizer]);

    return (
        <div className="viewer_container" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* 그래프 캔버스 영역 */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <canvas 
                    ref={canvasRef} 
                    style={{ width: '100%', height: '100%' }} 
                />
            </div>

            <div className="grid-item-overlay setting frostedglassmorphism flex-view" style={{top: '40px', right: 0, overflowY: 'auto', bottom: 0, padding: '20px'}}>
                {/* 상단 도구 선택 영역 */}
                <div>
                    <label style={{ marginRight: '10px' }}>
                        <strong>도구</strong>:
                    </label>
                    <select 
                        value={selectedToolKey} 
                        onChange={handleToolChange}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d9e6' }}
                    >
                        <option value="angle">관절 각도</option>
                        <option value="velocity">관절 이동 속도</option>
                        <option value="angle-velocity">관절 회전 속도</option>
                        <option value="height">관절 높이</option>
                    </select>
                </div>

                {/* 범례 컨테이너 영역 */}
                <div>
                    <div 
                        ref={legendRef} 
                        className="custom-legend-container flex-view"
                        style={{ textAlign: 'left'}}
                    >
                        {/* GraphVisualizer.setData에 의해 내부 DOM이 동적으로 생성됩니다 */}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default PoseGraphContainer;