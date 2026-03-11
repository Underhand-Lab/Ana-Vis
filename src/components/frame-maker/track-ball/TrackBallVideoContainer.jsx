import React, { useEffect, useRef, useMemo } from 'react';
import { useTrackFrame } from '../../../hooks/useTrackBallFrame';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js"

const TrackBallVideoContainer = ({ data, idx }) => {
  const canvasRef = useRef(null);
  const renderer = useMemo(() => new CanvasRenderer(), []);
  const { options, setOptions, drawImageAt } = useTrackFrame(data, renderer);

  // 렌더러에 캔버스 바인딩
  useEffect(() => {
    if (canvasRef.current && renderer) {
      renderer.setCanvas(canvasRef.current);
    }
  }, [renderer]);

  // 프레임 인덱스나 옵션 변경 시 다시 그리기
  useEffect(() => {
    drawImageAt(idx);
  }, [idx, drawImageAt, data]);

  const handleOptionChange = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="viewer_container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 메인 출력 캔버스 */}
      <canvas ref={canvasRef} style={{ width: '100%', flex: 1, display: 'block', backgroundColor: 'black' }} />

      <div className="grid-item-overlay setting frostedglassmorphism flex-view" style={{ top: '40px', right: 0, overflowY: 'auto', bottom: 0, padding: '20px', textAlign: 'left' }}>
        <label>
          <input 
            type="checkbox" 
            checked={options.showConfidence}
            onChange={(e) => handleOptionChange('showConfidence', e.target.checked)}
          /> 
          Confidence
        </label>

        <label>
          Box: 
          <input 
            type="color" 
            value={options.boxColor}
            onChange={(e) => handleOptionChange('boxColor', e.target.value)}
          />
        </label>

        <label>
          Trail: 
          <input 
            type="color" 
            value={options.trailColor}
            onChange={(e) => handleOptionChange('trailColor', e.target.value)}
          />
        </label>
      </div>
    </div>
  );
};

export default TrackBallVideoContainer;