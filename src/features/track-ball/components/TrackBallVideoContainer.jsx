import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useTrackFrame } from '../hooks/useTrackBallFrame.jsx';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js"

const TrackBallVideoContainer = ({ data, idx }) => {
  const canvasRef = useRef(null);
  const renderer = useMemo(() => new CanvasRenderer(), []);
  const { options, setOptions, getTrackLayer } = useTrackFrame(data, renderer);

  // 렌더러에 캔버스 바인딩
  useEffect(() => {
    if (canvasRef.current && renderer) {
      renderer.setCanvas(canvasRef.current);
    }
  }, [renderer]);
  
  const drawImageAt = useCallback(async (frameIdx) => {
    if (!data) return null;

    const backgroundImage = data.getRawImgList(0)[frameIdx];
    if (!backgroundImage) return null;

    const trackLayer = await getTrackLayer(frameIdx);

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = backgroundImage.width;
    compositeCanvas.height = backgroundImage.height;
    const ctx = compositeCanvas.getContext('2d');

    ctx.drawImage(backgroundImage, 0, 0); // 배경
    if (trackLayer) {
      ctx.drawImage(trackLayer, 0, 0); // 공 궤적 레이어
    }

    return compositeCanvas;
  }, [data, getTrackLayer]);

  // 실시간 화면 갱신
  useEffect(() => {
    const updateFrame = async () => {
      const composite = await drawImageAt(idx);
      if (composite && renderer) {
        renderer.updateLayout(composite.width, composite.height);
        renderer.drawImage(composite);
      }
    };
    updateFrame();
  }, [idx, drawImageAt, renderer]);

  const handleOptionChange = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      {/* 메인 출력 캔버스 */}
      <canvas ref={canvasRef} style={{ width: '100%', height: "100%", display: 'block', backgroundColor: 'black', position: 'absolute', top: 0 }} />

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