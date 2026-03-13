import React, { useState, useRef, useCallback } from 'react';
import AnalysisContainer from '../components/AnalysisGridContainer';
import VideoProcessorModal from '../components/VideoProcessorModal';
import Modal from '../components/Modal';
import Navigation from '../components/Navigation.jsx';

import TrackBallVideoContainer from "../features/track-ball/components/TrackBallVideoContainer.jsx"
import TrackBallTableContainer from "../features/track-ball/components/TrackBallTableContainer.jsx"

// 라이브러리 import
import { Processor } from '../lib/cv-val/processor.js';
import { TrackBallData } from "../lib/cv-val/track-ball/track-ball-data.js";
import * as BallDetector from '../lib/cv-val/track-ball/ball-detector/index.js';
//import * as FrameMaker from '../lib/cv-val-visualizer/track-ball/index.js';
import * as Analysis from "../lib/cv-val/track-ball/calc/analysis.js";
import { frameMakerDataToBlob } from "../lib/cv-val-visualizer/common/frame-maker-export.js";
import { saveBlobWithPicker } from "../lib/save-blob.js";

// YOLO 탐지기 설정
const DETECTORS = {
    "yolo11x": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11x_web_model/model.json", 32),
    "yolo11l": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11l_web_model/model.json", 32),
    "yolo11m": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11m_web_model/model.json", 32),
    "yolo11s": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11s_web_model/model.json", 32),
    "yolo11n": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11n_web_model/model.json", 32),
};

const MAKER_CONFIG = {
    "video": {
        Component: TrackBallVideoContainer
    },
    "table": {
        Component: (props) => (
            <TrackBallTableContainer 
                {...props} 
                analysisTool={new Analysis.BallAnalysisTool()} 
            />
        ),
        src: "./template/track-ball/table.html",
        create: () => {
            const fm = new FrameMaker.CustomTableFrameMaker();
            fm.changeAnalysisTool(new Analysis.BallAnalysisTool());
            return fm;
        }
    }
};

const TrackBallPage = () => {
    const [processedData, setProcessedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [statusKey, setStatusKey] = useState('label-before-process');
    const [currentIdx, setCurrentIdx] = useState(0);
    const [confValue, setConfValue] = useState(0.01);

    // 후보군(Candidate) UI 상태 관리
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(-1);
    const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

    const [isProcessModalOpen, setProcessModalOpen] = useState(false);
    const [isToolModalOpen, setToolModalOpen] = useState(false);

    const analysisBoxRef = useRef(null);
    const dataInputRef = useRef(null);

    // 프레임 변경 시 후보군 UI 갱신 (기존 updateCandidateUI 로직)
    const updateCandidateState = useCallback((frameIdx) => {

        if (!processedData) return;

        setCurrentFrameIdx(frameIdx);

        const cands = processedData.getCandidatesAt(frameIdx) || [];
        const frameData = processedData.getBallList()[frameIdx];
        const currentSelected = frameData ? frameData.selectedIdx : -1;

        setCandidates(cands);
        setSelectedCandidateIdx(currentSelected);
    }, [processedData]);

    const maxFrame = processedData ? (processedData.getFrameCnt() - 1) : 0;

    // 파일 불러오기 핸들러 (.cvbl)
    const handleLoadFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = new TrackBallData();
            await data.loadFromFile(file);
            setProcessedData(data);
            setCurrentIdx(0);
            e.target.value = "";
        } catch (err) {
            console.error(err);
            alert("데이터 파일을 불러오는 데 실패했습니다.");
        }
    };

    // 비디오 처리 실행
    const handleProcessVideo = async (files, model) => {
        if (!files || files.length < 1) return;

        // 수정사항: 초기화 로직
        setProgress({ current: 0, total: 0 });
        setIsProcessing(true);

        const processor = new Processor();
        try {
            processor.setting(DETECTORS[model], {
                onState: (state) => setStatusKey(`label-${state}`),
                onProgress: (current, total) => setProgress({ current, total })
            });

            const result = await processor.processVideo(files, new TrackBallData());
            setProcessedData(result);
            setCurrentIdx(0);
            setProcessModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("비디오 처리 중 오류 발생");
        } finally {
            setIsProcessing(false);
        }
    };

    // CONF 변경 핸들러
    const handleConfChange = (e) => {
        const val = parseFloat(e.target.value);
        setConfValue(val);
        if (processedData) {
            processedData.setConf(val);
            analysisBoxRef.current?.updateImage();
        }
    };

    // 후보군 선택 변경 핸들러
    const handleCandidateChange = (e) => {
        const idx = parseInt(e.target.value);
        setSelectedCandidateIdx(idx);
        if (processedData) {
            processedData.setSelectedIdx(currentFrameIdx, idx);
            analysisBoxRef.current?.updateImage();
        }
    };

    return (
        <div id="wrapper">
            {/* 데이터 불러오기용 숨겨진 input */}
            <input
                type="file"
                ref={dataInputRef}
                style={{ display: 'none' }}
                accept=".cvbl"
                onChange={handleLoadFile}
            />

            <Navigation buttons={[
                {
                    name: "새 분석",
                    action: () => {
                        setProgress({ current: 0, total: 0 }); // 진행도 초기화
                        setStatusKey('label-before-process'); // 상태 메시지 초기화
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
                            await saveBlobWithPicker(blob, "trackBall.cvbl", [{
                                description: 'Track Ball Data File',
                                accept: { 'application/cvbl': ['.cvbl'] },
                            }], true, "cvbl");
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
            ]} />

            <AnalysisContainer
                ref={analysisBoxRef}
                currentIdx={currentIdx}
                data={processedData}
                toolConfigs={MAKER_CONFIG}
                defaultTools={["video", "table"]}
            />

            <div className="slider">
                <div className="container neumorphism">
                    <div className="divide">
                        <input
                            type="range"
                            id="frameSlider"
                            min="0"
                            max={maxFrame}
                            step="1"
                            value={currentIdx}
                            onChange={(e) => {
                                const idx = parseInt(e.target.value, 10);
                                setCurrentIdx(idx);
                                updateCandidateState(idx);
                            }}
                            style={{ flex: 1 }}
                        />

                        <button style={{ whiteSpace: "nowrap" }} onClick={() => setToolModalOpen(true)}>
                            도구 추가
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>

                        {/* CONF 입력 UI */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <label htmlFor="confInput">CONF: </label>
                            <input
                                type="number"
                                id="confInput"
                                value={confValue}
                                step="0.01"
                                min="0" max="1"
                                onChange={handleConfChange}
                                className="neumorphism-input"
                                style={{ width: '60px' }}
                            />
                        </div>

                        {/* 후보군 선택 UI (Candidate Select) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <label>선택: </label>
                            <select
                                value={selectedCandidateIdx}
                                onChange={handleCandidateChange}
                                className="neumorphism-select"
                            >
                                <option value="-1">none</option>
                                {candidates.map((cand, i) => (
                                    <option key={i} value={i}>
                                        {`${i + 1} (${(cand.confidence * 100).toFixed(0)}%)`}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                    </div>
                </div>
            </div>

            {/* 모달: 비디오 분석 */}

            <VideoProcessorModal
                isOpen={isProcessModalOpen}
                onClose={() => setProcessModalOpen(false)}
                models={Object.keys(DETECTORS)}
                defaultModel={"yolo11m"}
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
                    {['video', 'table'].map(key => (
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

export default TrackBallPage;