import React, { useState, useRef } from 'react';
import Modal from './Modal';

const VideoProcessorModal = ({ 
  isOpen, 
  onClose, 
  title = "비디오 처리",
  models = [], // [{ value: 'model1', label: '모델1' }, ...]
  defaultModel,
  onProcess,   // 실제 처리 함수 (files, selectedModel) => Promise
  isProcessing,
  progress,    // { current: 0, total: 0 }
  statusKey 
}) => {
  const [selectedModel, setSelectedModel] = useState(defaultModel || models[0] || '');
  const [hasFile, setHasFile] = useState(false);
  const videoInputRef = useRef(null);

const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setHasFile(false);
      setVideoUrl(null);
      return;
    }

    setHasFile(true);
    const fileSizeMB = file.size / (1024 * 1024);
    
    // 기기 메모리 정보 (단위: GB, 브라우저에 따라 제공 안 될 수 있음)
    const deviceMemory = navigator.deviceMemory || 8; 
    
    // 모델별/메모리별 임계값 설정 (예시)
    let limit = deviceMemory <= 4 ? 3 : 5; // 저사양 기기는 200MB, 일반은 500MB 기준
    
    console.log(deviceMemory);

    if (fileSizeMB > limit) {
      alert(`⚠️ 파일이 너무 큽니다(${Math.round(fileSizeMB)}MB). 처리 중 브라우저가 멈출 수 있습니다. 짧은 영상을 권장합니다.`);
    }

    // 미리보기 및 자르기 안내를 위한 URL 생성
  };

  const handleStart = () => {
    const files = videoInputRef.current?.files;
    if (!files || files.length < 1) return;
    onProcess(files, selectedModel);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isProcessing && onClose()}
      title={title}
    >
      <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: '1' }}>
            <input
              type="file"
              ref={videoInputRef}
              accept="video/*"
              style={{ width: '100%' }}
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </div>
          {models.length > 0 && (
            <div style={{ whiteSpace: 'nowrap' }}>
              <label htmlFor="model-select">모델 선택 </label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="neumorphism-select"
                disabled={isProcessing}
              >
                {models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <button
            style={{ width: '100%', margin: '0px', padding: '12px 24px', fontSize: '16px' }}
            onClick={handleStart}
            disabled={!hasFile || isProcessing}
          >
            {isProcessing ? '처리 중...' : '분석 시작'}
          </button>

          <div id="status-section" style={{ marginTop: '15px' }}>
            <p style={{ fontSize: '14px', color: '#666' }}>
              {statusKey}
              {isProcessing && progress.total > 0 && ` : ${progress.current} / ${progress.total}`}
            </p>

            <div id="progress-bar-container" style={{ 
              width: '100%', height: '10px', background: '#eee', borderRadius: '5px', overflow: 'hidden' 
            }}>
              <div
                id="progress-bar"
                style={{ 
                  width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
                  height: '100%',
                  background: '#4CAF50',
                  transition: 'width 0.3s ease'
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default VideoProcessorModal;