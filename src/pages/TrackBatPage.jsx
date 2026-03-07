import React, { useState, useRef, useCallback } from 'react';
import AnalysisContainer from '../components/AnalysisContainer';
import Modal from '../components/Modal';
import Navigation from '../components/Navigation.jsx';

// 라이브러리 import
import { Processor } from '../lib/cv-val/processor.js';
import { TrackBatData } from "../lib/cv-val/track-bat/track-bat-data.js";
import * as BatDetector from '../lib/cv-val/track-bat/bat-detector/index.js';
import { TrackBatFrameMaker } from "../lib/cv-val/track-bat/frame-maker/frame-maker.js";
import { frameMakerDataToBlob } from "../lib/cv-val/common/frame-maker-export.js";
import { saveBlobWithPicker } from "../lib/save-blob.js";

// YOLO Bat Detector 설정
const DETECTORS = {
    "yolo11x": new BatDetector.YOLOBatDetector("/cv-val/external/models/yolo11/yolo11x-seg_web_model/model.json", 34),
    "yolo11l": new BatDetector.YOLOBatDetector("/cv-val/external/models/yolo11/yolo11l-seg_web_model/model.json", 34),
    "yolo11m": new BatDetector.YOLOBatDetector("/cv-val/external/models/yolo11/yolo11m-seg_web_model/model.json", 34),
    "yolo11s": new BatDetector.YOLOBatDetector("/cv-val/external/models/yolo11/yolo11s_web_model/model.json", 34),
    "yolo11n": new BatDetector.YOLOBatDetector("/cv-val/external/models/yolo11/yolo11n-seg_web_model/model.json", 34),
    "yolo26n": new BatDetector.YOLOBatDetector("/cv-val/external/models/yolo11/yolo11m-seg_web_model/model.json", 34)
};

const TrackBatPage = () => {
    const [processedData, setProcessedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [statusKey, setStatusKey] = useState('label-before-process');
    const [selectedModel, setSelectedModel] = useState('yolo11m');
    const [confValue, setConfValue] = useState(0.55); // 기본값 0.55
    const [hasFile, setHasFile] = useState(false);

    // 후보군(Candidate) 관련 상태
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(-1);
    const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

    const [isProcessModalOpen, setProcessModalOpen] = useState(false);
    const [isToolModalOpen, setToolModalOpen] = useState(false);

    const analysisBoxRef = useRef(null);
    const videoInputRef = useRef(null);
    const dataInputRef = useRef(null);

    // 프레임 변경 시 후보군 UI 업데이트 로직
    const updateCandidateState = useCallback((frameIdx) => {
        if (!analysisBoxRef.current?.data) return;

        const data = analysisBoxRef.current.data;
        setCurrentFrameIdx(frameIdx);

        const cands = data.getCandidatesAt(frameIdx) || [];
        const frameData = data.getBatList()[frameIdx]; // Bat List 참조
        const currentSelected = frameData ? frameData.selectedIdx : -1;

        setCandidates(cands);
        setSelectedCandidateIdx(currentSelected);
    }, []);

    // 헬퍼: Hex 색상을 RGBA 배열로 변환
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b, parseInt(alpha)];
    };

    // 데이터 불러오기 (.cvbt)
    const handleLoadFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = new TrackBatData();
            await data.loadFromFile(file);
            setProcessedData(data);
            e.target.value = "";
        } catch (err) {
            alert("데이터 파일을 불러오는 데 실패했습니다.");
        }
    };

    // 분석 인스턴스 초기화
    const handleInstanceReady = useCallback(async (instance) => {
        analysisBoxRef.current = instance;

        // 엔진 업데이트 이벤트 바인딩
        instance.bindUI(document, {
            onUpdate: (frameIdx) => updateCandidateState(frameIdx)
        });

        const MAKER_CONFIG = {
            "video": {
                src: "/cv-val/template/track-bat/video.html",
                create: () => new TrackBatFrameMaker(),
                bindUI: (box, frameMaker) => {
                    // batVideoUIBinder 로직 구현
                    const saveBtn = box.querySelector(".save");
                    const trailInput = box.querySelector(".trailInput");
                    const batColor = box.querySelector(".bat-color");
                    const batColorAlpha = box.querySelector(".bat-color-alpha");
                    const trailColor = box.querySelector(".trail-color");
                    const trailColorAlpha = box.querySelector(".trail-color-alpha");

                    const colorChange = () => {
                        frameMaker.setColors(
                            hexToRgba(batColor.value, batColorAlpha.value),
                            hexToRgba(trailColor.value, trailColorAlpha.value)
                        );
                        frameMaker.drawImageAt(instance.nowIdx());
                    };

                    [batColor, batColorAlpha, trailColor, trailColorAlpha].forEach(el => {
                        el?.addEventListener('change', colorChange);
                    });

                    frameMaker.setTrail(trailInput);
                    frameMaker.bindUI(box);
                    if (batColor) colorChange();

                    saveBtn?.addEventListener('click', async () => {
                        const currentData = instance.data;
                        if (!currentData) return;
                        const blob = await frameMakerDataToBlob(frameMaker, currentData);
                        await saveBlobWithPicker(blob, "trackBatVideo.mp4", [{
                            description: 'Video File', accept: { 'video/mp4': ['.mp4'] }
                        }], true, "mp4");
                    });
                }
            }
        };

        await instance.registerFrameMaker("video", MAKER_CONFIG.video);
        instance.initDefault(["video"]);
    }, [updateCandidateState]);

    // 비디오 처리 실행
    const handleProcessVideo = async () => {
        const files = videoInputRef.current?.files;
        if (!files || files.length < 1) return;

        setProgress({ current: 0, total: 0 });
        setIsProcessing(true);
        const processor = new Processor();
        try {
            processor.setting(DETECTORS[selectedModel], {
                onState: (state) => setStatusKey(`label-${state}`),
                onProgress: (current, total) => setProgress({ current, total })
            });
            const result = await processor.processVideo(files, new TrackBatData());
            setProcessedData(result);
            setProcessModalOpen(false);
        } catch (e) {
            alert("비디오 처리 중 오류 발생");
        } finally {
            setIsProcessing(false);
        }
    };

    // CONF 변경
    const handleConfChange = (e) => {
        const val = parseFloat(e.target.value);
        setConfValue(val);
        if (processedData) {
            processedData.setConf(val);
            analysisBoxRef.current?.updateImage();
        }
    };

    // 후보군 선택 변경
    const handleCandidateChange = (e) => {
        const idx = parseInt(e.target.value);
        setSelectedCandidateIdx(idx);
        if (processedData) {
            processedData.setSelectedIdx(analysisBoxRef.current.nowIdx(), idx);
            analysisBoxRef.current?.updateImage();
        }
    };

    return (
        <div id="wrapper">
            <input type="file" ref={dataInputRef} style={{ display: 'none' }} accept=".cvbt" onChange={handleLoadFile} />

            <Navigation buttons={[
                {
                    name: "새 분석", action: () => {
                        setHasFile(false);
                        setProgress({ current: 0, total: 0 });
                        setStatusKey('label-before-process');
                        setProcessModalOpen(true);
                    }
                },
                { name: "불러오기", action: () => dataInputRef.current?.click() },
                {
                    name: "저장", action: async () => {
                        if (!processedData) return;
                        const blob = await processedData.toBlob();
                        await saveBlobWithPicker(blob, "trackBat.cvbt", [{
                            description: 'Track Bat Data File', accept: { 'application/cvbt': ['.cvbt'] },
                        }], true, "cvbt");
                    }
                }
            ]} />

            <AnalysisContainer data={processedData} onInstanceReady={handleInstanceReady} />


            <div className="slider">
                <div className="container neumorphism">
                    <div className="divide">
                        <input type="range" id="frameSlider" min="0" max="0" step="1" />


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

            <Modal isOpen={isProcessModalOpen} onClose={() => !isProcessing && setProcessModalOpen(false)} title="비디오 처리">
                <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ flex: '1' }}>
                            <input type="file" ref={videoInputRef} accept="video/*" style={{ width: '100%' }} onChange={(e) => setHasFile(e.target.files.length > 0)} />
                        </div>
                        <div>
                            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="neumorphism-select">
                                {Object.keys(DETECTORS).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <button
                            style={{ width: '100%', margin: '0px', padding: '12px 24px', fontSize: '16px' }}
                            onClick={handleProcessVideo}
                            disabled={!hasFile || isProcessing}
                        >
                            {isProcessing ? '처리 중...' : '분석 시작'}
                        </button>
                        <div id="status-section">
                            <p>{statusKey} {isProcessing && progress.total > 0 && ` : ${progress.current} / ${progress.total}`}</p>
                            <div id="progress-bar-container">
                                <div id="progress-bar" style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isToolModalOpen} onClose={() => setToolModalOpen(false)} title="분석 도구 추가">
                <div>
                    <button onClick={() => { analysisBoxRef.current?.addFrame("video"); setToolModalOpen(false); }}>VIDEO</button>
                    <br />
                    <label className="label-for-btn">
                        Plugin
                        <input type="file" style={{ display: 'none' }} accept=".js" onChange={async (e) => {
                            if (e.target.files[0]) {
                                await analysisBoxRef.current?.registerPlugin(e.target.files[0]);
                                setToolModalOpen(false);
                            }
                        }} />
                    </label>
                </div>
            </Modal>
        </div>
    );
};

export default TrackBatPage;