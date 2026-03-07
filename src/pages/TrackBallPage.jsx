import React, { useState, useRef, useCallback } from 'react';
import AnalysisContainer from '../components/AnalysisContainer';
import Modal from '../components/Modal';
import Navigation from '../components/Navigation.jsx';

// 라이브러리 import
import { Processor } from '../lib/cv-val/processor.js';
import { TrackBallData } from "../lib/cv-val/track-ball/track-ball-data.js";
import * as BallDetector from '../lib/cv-val/track-ball/ball-detector/index.js';
import * as FrameMaker from '../lib/cv-val/track-ball/frame-maker/index.js';
import * as Analysis from "../lib/cv-val/track-ball/calc/analysis.js";
import { frameMakerDataToBlob } from "../lib/cv-val/common/frame-maker-export.js";
import { saveBlobWithPicker } from "../lib/save-blob.js";

// YOLO 탐지기 설정
const DETECTORS = {
    "yolo11x": new BallDetector.YOLOBallDetector("/cv-val/external/models/yolo11/yolo11x_web_model/model.json", 32),
    "yolo11l": new BallDetector.YOLOBallDetector("/cv-val/external/models/yolo11/yolo11l_web_model/model.json", 32),
    "yolo11m": new BallDetector.YOLOBallDetector("/cv-val/external/models/yolo11/yolo11m_web_model/model.json", 32),
    "yolo11s": new BallDetector.YOLOBallDetector("/cv-val/external/models/yolo11/yolo11s_web_model/model.json", 32),
    "yolo11n": new BallDetector.YOLOBallDetector("/cv-val/external/models/yolo11/yolo11n_web_model/model.json", 32),
};

const TrackBallPage = () => {
    const [processedData, setProcessedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [statusKey, setStatusKey] = useState('label-before-process');
    const [selectedModel, setSelectedModel] = useState('yolo11m');
    const [confValue, setConfValue] = useState(0.01); //
    const [hasFile, setHasFile] = useState(false);

    // 후보군(Candidate) UI 상태 관리
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(-1);
    const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

    const [isProcessModalOpen, setProcessModalOpen] = useState(false);
    const [isToolModalOpen, setToolModalOpen] = useState(false);

    const analysisBoxRef = useRef(null);
    const videoInputRef = useRef(null);
    const dataInputRef = useRef(null);

    // 프레임 변경 시 후보군 UI 갱신 (기존 updateCandidateUI 로직)
    const updateCandidateState = useCallback((frameIdx) => {
        if (!analysisBoxRef.current?.data) return;

        const data = analysisBoxRef.current.data;
        setCurrentFrameIdx(frameIdx);

        const cands = data.getCandidatesAt(frameIdx) || [];
        const frameData = data.getBallList()[frameIdx];
        const currentSelected = frameData ? frameData.selectedIdx : -1;

        setCandidates(cands);
        setSelectedCandidateIdx(currentSelected);
    }, []);

    // 파일 불러오기 핸들러 (.cvbl)
    const handleLoadFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = new TrackBallData();
            await data.loadFromFile(file);
            setProcessedData(data);
            e.target.value = "";
        } catch (err) {
            console.error(err);
            alert("데이터 파일을 불러오는 데 실패했습니다.");
        }
    };

    // 인스턴스 초기화 및 이벤트 바인딩
    const handleInstanceReady = useCallback(async (instance) => {
        analysisBoxRef.current = instance;

        // 엔진의 프레임 업데이트 이벤트 구독
        instance.bindUI(document, {
            onUpdate: (frameIdx) => updateCandidateState(frameIdx)
        });

        const MAKER_CONFIG = {
            "video": {
                src: "/cv-val/template/track-ball/video.html",
                create: () => new FrameMaker.TrackFrameMaker(),
                bindUI: (box, frameMaker) => {
                    box.querySelector(".save")?.addEventListener('click', async () => {
                        const currentData = instance.data;
                        if (!currentData) return;
                        const blob = await frameMakerDataToBlob(frameMaker, currentData);
                        await saveBlobWithPicker(blob, "trackBallVideo.mp4", [{
                            description: 'Video File', accept: { 'video/mp4': ['.mp4'] }
                        }], true, "mp4");
                    });
                }
            },
            "table": {
                src: "/cv-val/template/track-ball/table.html",
                create: () => {
                    const fm = new FrameMaker.CustomTableFrameMaker();
                    fm.changeAnalysisTool(new Analysis.BallAnalysisTool());
                    return fm;
                }
            }
        };

        for (const [key, config] of Object.entries(MAKER_CONFIG)) {
            await instance.registerFrameMaker(key, config);
        }
        instance.initDefault(['video', 'table']);
    }, [updateCandidateState]);

    // 비디오 처리 실행
    const handleProcessVideo = async () => {
        const files = videoInputRef.current?.files;
        if (!files || files.length < 1) return;

        // 수정사항: 초기화 로직
        setProgress({ current: 0, total: 0 });
        setIsProcessing(true);

        const processor = new Processor();
        try {
            processor.setting(DETECTORS[selectedModel], {
                onState: (state) => setStatusKey(`label-${state}`),
                onProgress: (current, total) => setProgress({ current, total })
            });

            const result = await processor.processVideo(files, new TrackBallData());
            setProcessedData(result);
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
                        setHasFile(false); // 파일 상태 초기화
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
                data={processedData}
                onInstanceReady={handleInstanceReady}
            />

            <div className="slider">
                <div className="container neumorphism">
                    <div className="divide">
                        <input type="range" id="frameSlider" min="0" max="0" step="1" />


                        <button style={{ whiteSpace: "nowrap" }} onClick={() => setToolModalOpen(true)}>
                            도구 추가
                        </button>
                    </div>
                    <div style={{display:'flex', gap: '10px'}}>

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
            <Modal
                isOpen={isProcessModalOpen}
                onClose={() => !isProcessing && setProcessModalOpen(false)}
                title="비디오 처리"
            >
                <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ flex: '1' }}>
                            <input
                                type="file"
                                ref={videoInputRef}
                                accept="video/*"
                                style={{ width: '100%' }}
                                onChange={(e) => setHasFile(e.target.files.length > 0)} // 수정사항: 파일 유무 감지
                            />
                        </div>
                        <div style={{ whiteSpace: 'nowrap' }}>
                            <label htmlFor="model">모델 선택 </label>
                            <select
                                value={selectedModel}
                                id="model"
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="neumorphism-select"
                            >
                                {Object.keys(DETECTORS).map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        {/* 수정사항: 파일 미선택 시 비활성화 */}
                        <button
                            style={{ width: '100%', margin: '0px', padding: '12px 24px', fontSize: '16px' }}
                            onClick={handleProcessVideo}
                            disabled={!hasFile || isProcessing}
                        >
                            {isProcessing ? '처리 중...' : '분석 시작'}
                        </button>

                        <div id="status-section">
                            {/* 수정사항: 분석 중일 때만 진행 프레임 숫자 노출 */}
                            <p>
                                {statusKey}
                                {isProcessing && progress.total > 0 && ` : ${progress.current} / ${progress.total}`}
                            </p>

                            <div id="progress-bar-container">
                                <div
                                    id="progress-bar"
                                    style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

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
                                analysisBoxRef.current?.addFrame(key);
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