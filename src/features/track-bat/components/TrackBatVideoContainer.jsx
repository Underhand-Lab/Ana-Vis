import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useTrackBatFrame } from '../hooks/useTrackBatFrame.jsx';
import { CanvasRenderer } from "../../../lib/cv-val-visualizer/canvas-renderer.js"
import { MediabunnyImageListToVideo } from '../../../lib/image-list-to-video/media-bunny.js';
import { exportVideo } from '../../../hooks/useToVideo.jsx';

const TrackBatVideoContainer = ({ data, idx }) => {
  const canvasRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const renderer = useMemo(() => new CanvasRenderer(), []);
  useEffect(() => {
    if (canvasRef.current && renderer) {
      renderer.setCanvas(canvasRef.current);
    }
  }, [renderer]);
  // Hook에서 레이어 생성 함수 가져오기
  const { colors, setColors, trailLen, setTrailLen, getTrailLayer } = useTrackBatFrame(data);

  // ✅ 1. 원본 이미지와 레이어를 합성하는 공통 함수
  const drawImageAt = (frameIdx) => {
    if (!data) return null;

    // 원본 이미지 가져오기
    const rawImgList = data.getRawImgList(0);
    const backgroundImage = rawImgList[frameIdx];
    if (!backgroundImage) return null;

    // 레이어 가져오기
    const trailLayer = getTrailLayer(frameIdx);

    // 합성용 임시 캔버스 생성
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = backgroundImage.width;
    compositeCanvas.height = backgroundImage.height;
    const ctx = compositeCanvas.getContext('2d');

    // 배경 -> 레이어 순으로 그리기
    ctx.drawImage(backgroundImage, 0, 0);
    if (trailLayer) {
      ctx.drawImage(trailLayer, 0, 0, backgroundImage.width, backgroundImage.height);
    }

    return compositeCanvas;
  };

  // 화면 렌더링 로직
  useEffect(() => {
      const composite = drawImageAt(idx);
      if (composite && renderer) {
        renderer.updateLayout(composite.width, composite.height);
        renderer.drawImage(composite);
      }
  }, [idx, drawImageAt, renderer]);

  // 비디오 내보내기 로직
  const handleExportVideo = async () => {
    if (!data || isExporting) return;
    
    setIsExporting(true);

    await exportVideo(drawImageAt, data.getFrameCnt(), {
      fps: data.fps,
      name: `tracked_video_${Date.now()}.mp4`
    });

    setIsExporting(false);
    
  };

  return (
    <div>
      {/* 메인 출력 캔버스 */}
      <canvas ref={canvasRef} style={{ width: '100%', height: "100%", display: 'block', backgroundColor: 'black', position: 'absolute', top: 0 }} />

      <div className="grid-item-overlay setting frostedglassmorphism flex-view" style={{ top: '40px', right: 0, overflowY: 'auto', bottom: 0, padding: '20px', textAlign: 'left' }}>

        <button
          onClick={handleExportVideo}
          disabled={isExporting}
          style={{ padding: '10px', width: '100%', cursor: isExporting ? 'not-allowed' : 'pointer' }}
        >
          {isExporting ? '저장중..' : '저장하기'}
        </button>
        {/* 궤적 길이 조절 */}
        <div className="control-group">
          <label>Trail Length: </label>
          <input style={{ width: '60px' }} type="number" pattern="\d*"
            inputMode="decimal" step="1"
            value={trailLen}
            max={data?.getFrameCnt() - 1 || 0}
            onChange={(e) => setTrailLen(parseInt(e.target.value))}
          />
        </div>

        {/* 배트 색상 설정 */}
        <div className="control-group">
          <label>Bat Color</label>
          <br />
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
          <br />
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