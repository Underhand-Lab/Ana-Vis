import React, { useState, useRef, useCallback, useEffect } from 'react';
import NewAnalysisGridContainer from '../common/components/NewAnalysisGridContainer.tsx';
import VideoProcessorModal from '../common/components/VideoProcessorModal.jsx';
import Modal from '../common/components/Modal.jsx';
import Navigation from '../common/components/Navigation.jsx';

// 라이브러리 import (New modules)
import { Processor } from '../lib/cv-val/processor.js';
import { TrackBatData } from "../lib/cv-val/track-bat/track-bat-data.js";
import * as BatDetector from '../lib/cv-val/track-bat/bat-detector/index.js';

import TrackBatVideoModule from "../features/track-bat/modules/TrackBatVideoModule.jsx"
import { saveBlobWithPicker } from "../lib/save-blob.js"; // This is already imported

// YOLO Bat Detector 설정
const DETECTORS = {
    "yolo11x": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11x-seg_web_model/model.json", 34),
    "yolo11l": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11l-seg_web_model/model.json", 34),
    "yolo11m": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11m-seg_web_model/model.json", 34),
    "yolo11s": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11s_web_model/model.json", 34),
    "yolo11n": new BatDetector.YOLOBatDetector("/cv-val/external/models/yolo11/yolo11n-seg_web_model/model.json", 34),
    /*"yolo26n": new BatDetector.YOLOBatDetector("/cv-val/external/models/yolo11/yolo11m-seg_web_model/model.json", 34)*/
};

const ANALYSIS_TOOLS = {
    // Add any specific bat analysis tools here if needed, similar to PosePage
    // For now, let's assume no specific analysis tool for bat tracking data itself,
    // as the video container directly visualizes the raw bat data.
};

const AVAILABLE_MODULES = {
    "video": TrackBatVideoModule,
    // If there's a table for bat tracking, add it here
    // "table": TrackBatTableModule, // Assuming a NewTrackBatTableContainer will be created
};

const TrackBatPage = () => {
    const [processedData, setProcessedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [statusKey, setStatusKey] = useState('label-before-process');
    const [currentIdx, setCurrentIdx] = useState(0);
    const [confValue, setConfValue] = useState(0.55); // 기본값 0.55
    const [activeModules, setActiveModules] = useState([
        { ...TrackBatVideoModule, id: 'bat-video-default' },
        // { ...TrackBatTableModule, id: 'bat-table-default' } // Uncomment if TrackBatTableModule is available
    ]);

    // 후보군(Candidate) 관련 상태
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(-1);
    const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

    const [isProcessModalOpen, setProcessModalOpen] = useState(false);
    const [isToolModalOpen, setToolModalOpen] = useState(false);
    const dataInputRef = useRef(null);

    // 프레임 변경 시 후보군 UI 업데이트 로직
    const updateCandidateState = useCallback((frameIdx) => {

        if (!processedData) return;

        setCurrentFrameIdx(frameIdx);

        const cands = processedData.getCandidatesAt(frameIdx) || [];
        const frameData = processedData.getBatList()[frameIdx]; // Bat List 참조
        const currentSelected = frameData ? frameData.selectedIdx : -1;

        setCandidates(cands);
        setSelectedCandidateIdx(currentSelected);
    }, [processedData]);

    // 데이터나 프레임 인덱스가 변경될 때 후보군 상태를 자동으로 동기화
    useEffect(() => {
        updateCandidateState(currentIdx);
    }, [currentIdx, updateCandidateState]);

    const maxFrame = processedData ? (processedData.getFrameCnt() - 1) : 0;

    // 데이터 불러오기 (.cvbt)
    const handleLoadFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = new TrackBatData();
            await data.loadFromFile(file);
            setProcessedData(data);
            setCurrentIdx(0);
            e.target.value = "";
        } catch (err) {
            alert("데이터 파일을 불러오는 데 실패했습니다.");
        }
    };

    // 비디오 처리 실행
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
            const result = await processor.processVideo(files, new TrackBatData());
            setProcessedData(result);
            setCurrentIdx(0);
            setProcessModalOpen(false);
        } catch (e) {
            alert("비디오 처리 중 오류 발생");
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

    // 데이터에 분석 도구 주입 (모듈 내 View에서 사용하기 위함)
    // TrackBatPage는 현재 ANALYSIS_TOOLS가 비어있으므로, 이 useEffect는 큰 의미가 없을 수 있습니다.
    // 하지만 일관성을 위해 유지합니다.
    useEffect(() => {
        if (processedData) {
            processedData.analysisTools = ANALYSIS_TOOLS;
        }
    }, [processedData]);

    // CONF 변경
    const handleConfChange = (e) => {
        const val = parseFloat(e.target.value);
        setConfValue(val);
        if (processedData) {
            processedData.setConf(val);
            // 참조를 변경하여 하위 모듈의 리렌더링을 유도합니다.
            setProcessedData(Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData));
        }
    };

    // 후보군 선택 변경 로직 분리
    const updateCandidateSelection = (idx) => {
        setSelectedCandidateIdx(idx);
        if (processedData) {
            processedData.setSelectedIdx(currentFrameIdx, idx);
            // 참조를 변경하여 하위 모듈의 리렌더링을 유도합니다.
            setProcessedData(Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData));
        }
    };

    const handleCandidateChange = (e) => {
        updateCandidateSelection(parseInt(e.target.value));
    };

    return (
        <div id="wrapper">
            <input type="file" ref={dataInputRef} style={{ display: 'none' }} accept=".cvbt" onChange={handleLoadFile} />

            <Navigation buttons={[
                {
                    name: "새 분석", action: () => {
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

            <NewAnalysisGridContainer
                modules={activeModules}
                data={processedData}
                currentFrame={currentIdx}
                onRemoveModule={handleRemoveModule}
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
                                setCurrentIdx(parseInt(e.target.value, 10));
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <button 
                                    className="neumorphism-button" 
                                    style={{ padding: '0 8px', height: '30px', minWidth: '30px' }}
                                    onClick={() => {
                                        const nextIdx = selectedCandidateIdx <= -1 ? candidates.length - 1 : selectedCandidateIdx - 1;
                                        updateCandidateSelection(nextIdx);
                                    }}
                                >
                                    &lt;
                                </button>
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
                                <button 
                                    className="neumorphism-button" 
                                    style={{ padding: '0 8px', height: '30px', minWidth: '30px' }}
                                    onClick={() => {
                                        const nextIdx = selectedCandidateIdx >= candidates.length - 1 ? -1 : selectedCandidateIdx + 1;
                                        updateCandidateSelection(nextIdx);
                                    }}
                                >
                                    &gt;
                                </button>
                            </div>
                        </div>

                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                    </div>
                </div>
            </div>

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
                            <br />
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

export default TrackBatPage;