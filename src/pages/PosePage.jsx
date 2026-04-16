import React, { useState, useRef, useEffect } from 'react';
import NewAnalysisGridContainer from '../common/components/NewAnalysisGridContainer.tsx';
import VideoProcessorModal from '../common/components/VideoProcessorModal.jsx';
import Modal from '../common/components/Modal.jsx';
import Navigation from '../common/components/Navigation.jsx';

// 라이브러리 import
import { PoseData } from '../lib/cv-val/pose/pose-data.js';
import { Processor } from '../lib/cv-val/processor.js';
import * as PoseDetector from '../lib/cv-val/pose/pose-detector/index.js';
import * as PoseAnalysisTool from "../lib/cv-val/pose/analysis-tool/index.js";
import { saveBlobWithPicker } from "../lib/save-blob.js";

import PoseVideoModule from '../features/pose/modules/PoseVideoModule.jsx';
import PoseGraphModule from '../features/pose/modules/PoseGraphModule.jsx';
import PoseTableModule from '../features/pose/modules/PoseTableModule.jsx';
import Pose3DVideoModule from '../features/pose/modules/Pose3DVideoModule.jsx';


// 정적 설정값
const DETECTORS = {
  "mediapipe_heavy": new PoseDetector.MediaPipePoseDetector("./external/models/mediapipe/pose_landmarker_heavy.task"),
  "mediapipe_full": new PoseDetector.MediaPipePoseDetector("./external/models/mediapipe/pose_landmarker_full.task"),
  "mediapipe_lite": new PoseDetector.MediaPipePoseDetector("./external/models/mediapipe/pose_landmarker_lite.task"),
};

const ANALYSIS_TOOLS = {
  "angle": new PoseAnalysisTool.AngleAnalysisTool(),
  "angle-velocity": new PoseAnalysisTool.AngleVelocityAnalysisTool(),
  "velocity": new PoseAnalysisTool.VelocityAnalysisTool(),
  "height": new PoseAnalysisTool.HeightAnalysisTool(),
};

const AVAILABLE_MODULES = {
  "동영상": PoseVideoModule,
  "3D 동영상": Pose3DVideoModule,
  "그래프": PoseGraphModule,
  "표": PoseTableModule
};

const PosePage = () => {
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusKey, setStatusKey] = useState('label-before-process');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeModules, setActiveModules] = useState([
    { ...PoseVideoModule, id: 'video-default' },
    { ...PoseGraphModule, id: 'graph-default' }
  ]);

  const [isProcessModalOpen, setProcessModalOpen] = useState(false);
  const [isToolModalOpen, setToolModalOpen] = useState(false);

  const analysisBoxRef = useRef(null);
  const dataInputRef = useRef(null);

  // 데이터의 총 프레임 수를 계산 (processedData.length 가 존재한다고 가정)
  const maxFrame = processedData ? (processedData.getFrameCnt() - 1) : 0;

  // 파일 불러오기 핸들러 (.cvp)
  const handleLoadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = new PoseData();
      await data.loadFromFile(file);
      data.analysisTools = ANALYSIS_TOOLS; // 데이터 로드 즉시 도구 주입
      setProcessedData(data);
      setCurrentIdx(0); // 데이터 로드 시 인덱스 초기화
      e.target.value = "";
    } catch (err) {
      console.error("파일 로드 실패:", err);
      alert("데이터 파일을 불러오는 데 실패했습니다.");
    }
  };

  // 비디오 처리 핸들러
  const handleProcessVideo = async (files, model) => {
    if (!files || files.length < 1) return;

    setProgress({ current: 0, total: 0 });
    setIsProcessing(true);

    const processor = new Processor();
    try {
      processor.setting(DETECTORS[model], {
        onState: (state) => setStatusKey(`label-${state}`),
        onProgress: (current, total) => setProgress({ current, total })
      });

      const result = await processor.processVideo(files, new PoseData());
      result.analysisTools = ANALYSIS_TOOLS; // 처리 완료 즉시 도구 주입
      setProcessedData(result);
      setCurrentIdx(0); // 처리 완료 시 인덱스 초기화
      setProcessModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 분석 도구(모듈) 추가 핸들러
  const handleAddModule = (type) => {
    const moduleBase = AVAILABLE_MODULES[type];
    if (moduleBase) {
      setActiveModules(prev => [
        ...prev, 
        { ...moduleBase, id: `${type}-${Date.now()}` }
      ]);
    }
    setToolModalOpen(false);
  };

  // 분석 도구(모듈) 삭제 핸들러
  const handleRemoveModule = (id) => {
    setActiveModules(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div id="wrapper">
      <input
        type="file"
        ref={dataInputRef}
        style={{ display: 'none' }}
        accept=".cvp"
        onChange={handleLoadFile}
      />

      <Navigation buttons={[
        {
          name: "새 분석", action: () => {
            setProcessModalOpen(true);
          }
        },
        { name: "불러오기", action: () => dataInputRef.current?.click() },
        {
          name: "저장",
          action: async () => {
            if (!processedData) return;
            try {
              const blob = await processedData.toBlob();
              await saveBlobWithPicker(blob, "pose.cvp", [{
                description: 'Pose Data File',
                accept: { 'application/cvp': ['.cvp'] },
              }], true, ".cvp");
            } catch (error) {
              console.error(error);
            }
          }
        }
      ]} />

      {/* 그리드 컨테이너: currentIdx와 data를 prop으로 직접 전달 */}
      <NewAnalysisGridContainer
        modules={activeModules}
        data={processedData}
        currentFrame={currentIdx}
        onRemoveModule={handleRemoveModule}
      />

      {/* 하단 컨트롤러 영역 */}
      <div className="slider">
        <div className="container neumorphism">
          <div className="divide" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <input 
                type="range" 
                id="frameSlider" 
                min="0" 
                max={maxFrame} 
                step="1" 
                value={currentIdx}
                onChange={(e) => setCurrentIdx(parseInt(e.target.value, 10))} 
                style={{ flex: 1 }}
              />
            </div>
            
            <button 
              className="neumorphism-button"
              onClick={() => setToolModalOpen(true)}
            >
              도구 추가
            </button>
          </div>
        </div>
      </div>

      <VideoProcessorModal
        isOpen={isProcessModalOpen}
        onClose={() => setProcessModalOpen(false)}
        models={Object.keys(DETECTORS)}
        defaultModel={"mediapipe_full"}
        onProcess={handleProcessVideo}
        isProcessing={isProcessing}
        progress={progress}
        statusKey={statusKey}
      />

      <Modal
        isOpen={isToolModalOpen}
        onClose={() => setToolModalOpen(false)}
        title="분석 도구 추가"
      >
        <div>
          {Object.keys(AVAILABLE_MODULES).map(key => (
            <div key={key}>
            <button onClick={() => handleAddModule(key)}>
              {key.toUpperCase()}
            </button>
            <br/></div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default PosePage;