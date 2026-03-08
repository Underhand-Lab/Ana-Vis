import React, { useState, useMemo } from 'react';
import DataTable from '../../DataTable'; // 위에서 만든 파일

function PoseTableContainer({ data, idx, analysisTools }) {
  const [selectedToolKey, setSelectedToolKey] = useState("angle");

  // 데이터 계산 로직 (기존 CustomTableFrameMaker의 processData 역할)
  const currentFrameData = useMemo(() => {
    if (!data || !analysisTools) return null;

    const currentTool = analysisTools[selectedToolKey];
    const processedData = currentTool ? currentTool.calc(data) : data;

    // 현재 프레임(idx)의 데이터 추출
    return processedData[idx] || null;
  }, [data, selectedToolKey, analysisTools, idx]);

  return (
    <div className="viewer_container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div className="table-content-area" style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {/* 분리한 테이블 컴포넌트에 데이터만 주입 */}
        <DataTable data={currentFrameData} />
      </div>

      <div className="grid-item-overlay" style={{ width: '100%', height: '100%', top: 0, left: 0 }}>
        <div className="grid-item-header  frostedglassmorphism" style={{ padding: '10px 15px' }}>
          <select
            value={selectedToolKey}
            onChange={(e) => setSelectedToolKey(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '4px' }}
          >
            <option value="angle">관절 각도</option>
            <option value="velocity">관절 이동 속도</option>
            <option value="angle-velocity">관절 회전 속도</option>
            <option value="height">관절 높이</option>
          </select>
        </div></div>
    </div>
  );
}

export default PoseTableContainer;