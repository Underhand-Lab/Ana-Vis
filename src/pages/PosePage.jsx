import React, { useState, useRef, useCallback } from 'react';
import AnalysisContainer from '../components/AnalysisContainer';
import VideoProcessorModal from '../components/VideoProcessorModal';
import Modal from '../components/Modal';
import Navigation from '../components/Navigation.jsx';

// 라이브러리 import
import { PoseData } from '../lib/cv-val/pose/pose-data.js';
import { Processor } from '../lib/cv-val/processor.js';
import * as PoseDetector from '../lib/cv-val/pose/pose-detector/index.js';
import * as PoseFrameMaker from '../lib/cv-val/pose/frame-maker/index.js';
import * as PoseAnalysisTool from "../lib/cv-val/pose/analysis-tool/index.js";
import { frameMakerDataToBlob } from "../lib/cv-val/common/frame-maker-export.js";
import { saveBlobWithPicker } from "../lib/save-blob.js";

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


const MAKER_CONFIG = {
  "video": {
    src: "/cv-val/template/pose/video.html",
    create: () => new PoseFrameMaker.PoseBoneFrameMaker(),
    bindUI: (box, frameMaker) => {
      box.querySelector(".save")?.addEventListener('click', async () => {
        const currentData = instance.data;
        if (!currentData) return;
        const blob = await frameMakerDataToBlob(frameMaker, currentData);
        await saveBlobWithPicker(blob, "poseVideo.mp4", [{
          description: 'Video File', accept: { 'video/mp4': ['.mp4'] }
        }], true, "mp4");
      });
    }
  },
  "graph": {
    src: "/cv-val/template/pose/graph.html",
    create: () => new PoseFrameMaker.CustomGraphFrameMaker(ANALYSIS_TOOLS)
  },
  "table": {
    src: "/cv-val/template/pose/table.html",
    create: () => new PoseFrameMaker.CustomTableFrameMaker(ANALYSIS_TOOLS)
  }
};

const PosePage = () => {
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusKey, setStatusKey] = useState('label-before-process');

  const [isProcessModalOpen, setProcessModalOpen] = useState(false);
  const [isToolModalOpen, setToolModalOpen] = useState(false);

  const analysisBoxRef = useRef(null);
  const dataInputRef = useRef(null);

  // 파일 불러오기 핸들러 (.cvp)
  const handleLoadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = new PoseData();
      await data.loadFromFile(file);
      setProcessedData(data);
      e.target.value = "";
    } catch (err) {
      console.error("파일 로드 실패:", err);
      alert("데이터 파일을 불러오는 데 실패했습니다.");
    }
  };

  // 수정사항 3: 비디오 처리 핸들러 (이전 데이터 초기화 포함)
  const handleProcessVideo = async (files, model) => {

    if (!files || files.length < 1) return;

    // 분석 시작 시 진행도 초기화
    setProgress({ current: 0, total: 0 });
    setIsProcessing(true);

    const processor = new Processor();
    try {
      console.log(model);
      processor.setting(DETECTORS[model], {
        onState: (state) => setStatusKey(`label-${state}`),
        onProgress: (current, total) => setProgress({ current, total })
      });

      const result = await processor.processVideo(files, new PoseData());
      setProcessedData(result);
      setProcessModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
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

      <AnalysisContainer
        ref={analysisBoxRef}
        data={processedData}
        toolConfigs={MAKER_CONFIG}
        defaultTools={["video", "graph"]}
      />

      <div className="slider">
        <div className="container neumorphism">
          <div className="divide">
            <input type="range" id="frameSlider" min="0" max="0" step="1" />
            <button style={{ whiteSpace: "nowrap" }} onClick={() => setToolModalOpen(true)}>
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

      {/* 모달: 도구 추가 */}
      <Modal
        isOpen={isToolModalOpen}
        onClose={() => setToolModalOpen(false)}
        title="분석 도구 추가"
      >
        <div>
          {['video', 'graph', 'table'].map(key => (
            <div key={key}>
              <button onClick={() => {
                analysisBoxRef.current?.addTool(key);
                setToolModalOpen(false);
              }}>
                {key.toUpperCase()}
              </button>
              <br />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default PosePage;