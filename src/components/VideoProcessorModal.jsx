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

  const handleStart = () => {
    console.log("handleStart");
    const files = videoInputRef.current?.files;
    if (!files || files.length < 1) return;
    console.log("handleStart");
    console.log(selectedModel);
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
              onChange={(e) => setHasFile(e.target.files.length > 0)}
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