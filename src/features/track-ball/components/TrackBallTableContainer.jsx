import React, { useState, useEffect, useRef, useMemo } from 'react';
import DataTable from '../../../common/components/DataTable';

const TrackBallTableContainer = ({ data, idx, analysisTool }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentFrameData = () => {
    
    if (!data || !analysisTool) return null;

    const processedData = analysisTool ? analysisTool.calc(data, idx) : data;

    // 현재 프레임(idx)의 데이터 추출
    return processedData || null;
   
  };

  // 모바일인 경우 하단 여백을 추가하여 시스템 내비게이션 바와 겹침 방지
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0'
  };

  return (
    <div className="viewer_container" style={containerStyle}>
      <div className="table-content-area" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '5px' : 'var(--table-padding, 10px)' }}>
        <DataTable data={currentFrameData()} isMobile={isMobile} />
      </div>
    </div>
  );
};

export default TrackBallTableContainer;