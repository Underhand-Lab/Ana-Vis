import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useTrackFrame } from '../hooks/useTrackBallFrame.jsx';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js"
import { exportVideo } from '../../../common/utils/exportVideo';

const TrackBallVideoContainer = ({ data, idx }) => {
  const canvasRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const renderer = useMemo(() => new CanvasRenderer(), []);
  const { options, setOptions, getTrackLayer } = useTrackFrame(data, renderer);

  // 렌더러에 캔버스 바인딩
  useEffect(() => {
    if (canvasRef.current && renderer) {
      renderer.setCanvas(canvasRef.current);
    }
  }, [renderer]);

  // 비디오 내보내기 로직
  const handleExportVideo = async () => {
    if (!data || isExporting) return;

    setIsExporting(true);

    await exportVideo(drawImageAt, data.getFrameCnt(), {
      fps: data.fps,
      name: `track_ball_video_${Date.now()}.mp4`
    });

    setIsExporting(false);

  };

  const drawImageAt = (frameIdx) => {
    if (!data) return null;

    const backgroundImage = data.getRawImgList(0)[frameIdx];
    if (!backgroundImage) return null;

    const trackLayer = getTrackLayer(frameIdx);

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = backgroundImage.width;
    compositeCanvas.height = backgroundImage.height;
    const ctx = compositeCanvas.getContext('2d');

    ctx.drawImage(backgroundImage, 0, 0); // 배경
    if (trackLayer) {
      ctx.drawImage(trackLayer, 0, 0); // 공 궤적 레이어
    }

    return compositeCanvas;
  };

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

        <button
          onClick={handleExportVideo}
          disabled={isExporting}
          style={{ width: '100%', cursor: isExporting ? 'not-allowed' : 'pointer' }}
        >
          {isExporting ? '저장중..' : '저장하기'}
        </button>
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