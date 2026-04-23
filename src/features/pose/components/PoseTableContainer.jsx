import React, { useState, useMemo } from 'react';
import DataTable from '../../../common/components/DataTable';
import { Div } from '../../../common/components/ui/UI.jsx';

function PoseTableContainer({ data, idx, analysisTools }) {
  const [selectedToolKey, setSelectedToolKey] = useState("angle");

  // 데이터 계산 로직 (기존 CustomTableFrameMaker의 processData 역할)
  const processedData = useMemo(() => {

    if (!data || !analysisTools) return null;

    const currentTool = analysisTools[selectedToolKey];
    const processedData = currentTool ? currentTool.calc(data) : data;

    // 현재 프레임(idx)의 데이터 추출
    return processedData || null;
  }, [data, selectedToolKey, analysisTools]);

  const currentFrameData = () => {
    if (!processedData) return null;
    let ret = {}
    console.log(processedData);
    console.log(Object.keys(processedData));
    for (const key of Object.keys(processedData)) {
      console.log(key);
      ret[key] = processedData[key][idx].toFixed(2);
    }
    return ret;
  };

  return (
    <Div className="viewer_container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <Div className="table-content-area" style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {/* 분리한 테이블 컴포넌트에 데이터만 주입 */}
        <DataTable data={currentFrameData()} />
      </Div>

      <Div className="grid-item-overlay setting frostedglassmorphism flex-view" style={{ top: '40px', right: 0, overflowY: 'auto', bottom: 0, padding: '20px' }}>
        <Div>
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
        </Div></Div>
    </Div>
  );
}

export default PoseTableContainer;