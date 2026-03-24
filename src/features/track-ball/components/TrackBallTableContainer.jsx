import React, { useEffect, useRef, useMemo } from 'react';
import DataTable from '../../../common/components/DataTable';

const TrackBallTableContainer = ({ data, idx, analysisTool }) => {

  const currentFrameData = () => {
    
    if (!data || !analysisTool) return null;

    const processedData = analysisTool ? analysisTool.calc(data, idx) : data;

    // 현재 프레임(idx)의 데이터 추출
    return processedData || null;
   
  };

  return (
    <div className="viewer_container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div className="table-content-area" style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {/* 분리한 테이블 컴포넌트에 데이터만 주입 */}
        <DataTable data={currentFrameData()} />
      </div>
    </div>
  );
};

export default TrackBallTableContainer;