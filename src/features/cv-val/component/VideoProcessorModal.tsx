import React, { useState, useEffect, ChangeEvent } from 'react';
import Modal from '@common/components/Modal';
import { Div, Select, Button } from '@common/bridges/UIBridge';

interface VideoProcessorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  analysisMap: Record<string, Record<string, any>>;
  onProcess: (type: string, modelKey: string) => void;
  isProcessing: boolean;
  progress: { current: number; total: number };
  statusKey?: string;
}

const VideoProcessorModal: React.FC<VideoProcessorModalProps> = ({ 
  isOpen, 
  onClose, 
  title = "비디오 처리",
  analysisMap = {},
  onProcess,
  isProcessing,
  progress,
  statusKey 
}) => {
  const types = Object.keys(analysisMap);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // 초기값 설정 및 맵 변경 대응
  useEffect(() => {
    if (types.length > 0 && !selectedType) {
      setSelectedType(types[0]);
    }
  }, [analysisMap, types, selectedType]);

  useEffect(() => {
    if (selectedType && analysisMap[selectedType]) {
      const models = Object.keys(analysisMap[selectedType]);
      if (models.length > 0) {
        setSelectedModel(models[0]);
      }
    }
  }, [selectedType, analysisMap]);

  const handleStart = () => {
    if (selectedType && selectedModel) {
      onProcess(selectedType, selectedModel);
    }
  };

  const currentModels = selectedType ? Object.keys(analysisMap[selectedType] || {}) : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isProcessing && onClose()}
      title={title}
    >
      <Div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
        <Div style={{ display: 'flex', flexDirection: 'row', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="type-select" style={{ minWidth: '80px' }}>분석 방식</label>
            <Select
              id="type-select"
              value={selectedType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
              disabled={isProcessing}
              options={types}
              style={{ flex: 1 }}
            />
          </Div>

          <Div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="model-select" style={{ minWidth: '80px' }}>분석 모델</label>
            <Select
              id="model-select"
              value={selectedModel}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedModel(e.target.value)}
              disabled={isProcessing || currentModels.length === 0}
              options={currentModels}
              style={{ flex: 1 }}
            />
          </Div>
        </Div>

        <Div>
          <Button
            style={{ width: '100%', margin: '0px', padding: '12px 24px', fontSize: '16px' }}
            onClick={handleStart}
            disabled={!selectedType || !selectedModel || isProcessing}
          >
            {isProcessing ? '처리 중...' : '분석 시작'}
          </Button>

          <Div id="status-section" style={{ marginTop: '15px' }}>
            <p style={{ fontSize: '14px', color: '#666' }}>
              {statusKey}
              {isProcessing && progress.total > 0 && ` : ${progress.current} / ${progress.total}`}
            </p>

            <Div id="progress-bar-container" style={{ 
              width: 'calc(100% - 20px)', height: '10px', background: '#eee', borderRadius: '5px', overflow: 'hidden' 
            }}>
              <Div
                id="progress-bar"
                style={{ 
                  width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
                  height: '100%',
                  background: '#4CAF50',
                  transition: 'width 0.3s ease'
                }}
              ></Div>
            </Div>
          </Div>
        </Div>
      </Div>
    </Modal>
  );
};

export default VideoProcessorModal;