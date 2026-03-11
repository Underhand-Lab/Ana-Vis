import React, { useEffect, useRef, useMemo } from 'react';
import { useTrackBatFrame } from '../../../hooks/useTrackBatFrame';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js"

const TrackBatVideoContainer = ({ data, idx }) => {
  const canvasRef = useRef(null);
  const renderer = useMemo(() => new CanvasRenderer(), []);
  const { colors, setColors, trailLen, setTrailLen, drawImageAt } = useTrackBatFrame(data, renderer);

  useEffect(() => {
    if (canvasRef.current && renderer) {
      renderer.setCanvas(canvasRef.current);
    }
  }, [renderer]);

  useEffect(() => {
    drawImageAt(idx);
  }, [idx, drawImageAt, data]);

  return (
    <div className="viewer_container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 메인 출력 캔버스 */}
      <canvas ref={canvasRef} style={{ width: '100%', flex: 1, display: 'block', backgroundColor: 'black' }} />

      <div className="grid-item-overlay setting frostedglassmorphism flex-view" style={{ top: '40px', right: 0, overflowY: 'auto', bottom: 0, padding: '20px', textAlign: 'left' }}>
        {/* 궤적 길이 조절 */}
        <div className="control-group">
          <label>Trail Length: </label>
          <input style={{width: '60px'}} type="number" pattern="\d*"
                        inputMode="decimal"  step="1"
            value={trailLen}
            onChange={(e) => setTrailLen(parseInt(e.target.value))}
          />
        </div>

        {/* 배트 색상 설정 */}
        <div className="control-group">
          <label>Bat Color</label>
          <br/>
          <input 
            type="color" 
            value={colors.batColor}
            onChange={(e) => setColors(prev => ({ ...prev, batColor: e.target.value }))}
          />
          <input 
            type="range" min="0" max="255" value={colors.batAlpha}
            onChange={(e) => setColors(prev => ({ ...prev, batAlpha: e.target.value }))}
          />
        </div>

        {/* 궤적 색상 설정 */}
        <div className="control-group">
          <label>Trail Color</label>
          <br/>
          <input 
            type="color" 
            value={colors.trailColor}
            onChange={(e) => setColors(prev => ({ ...prev, trailColor: e.target.value }))}
          />
          <input 
            type="range" min="0" max="255" value={colors.trailAlpha}
            onChange={(e) => setColors(prev => ({ ...prev, trailAlpha: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
};

export default TrackBatVideoContainer;