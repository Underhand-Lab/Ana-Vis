import React, { useState, useRef, useCallback } from 'react';
import AnalysisContainer from '../components/AnalysisContainer';
import VideoProcessorModal from '../components/VideoProcessorModal';
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
    /*"yolo26n": new BatDetector.YOLOBatDetector("/cv-val/external/models/yolo11/yolo11m-seg_web_model/model.json", 34)*/
};


const MAKER_CONFIG = {
    "video": {
        src: "/cv-val/template/track-bat/video.html",
        create: () => new TrackBatFrameMaker(),
        bindUI: (box, frameMaker) => {
            // batVideoUIBinder 로직 구현
            const saveBtn = box.querySelector(".save");

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

const TrackBatPage = () => {
    const [processedData, setProcessedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [statusKey, setStatusKey] = useState('label-before-process');
    const [confValue, setConfValue] = useState(0.55); // 기본값 0.55

    // 후보군(Candidate) 관련 상태
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(-1);
    const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

    const [isProcessModalOpen, setProcessModalOpen] = useState(false);
    const [isToolModalOpen, setToolModalOpen] = useState(false);

    const analysisBoxRef = useRef(null);
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
            processedData.setSelectedIdx(currentFrameIdx, idx);
            analysisBoxRef.current?.updateImage();
        }
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

            <AnalysisContainer
                ref={analysisBoxRef}
                data={processedData}
                toolConfigs={MAKER_CONFIG}
                defaultTools={["video"]}
                onUpdate={updateCandidateState}
            />


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

            <Modal isOpen={isToolModalOpen} onClose={() => setToolModalOpen(false)} title="분석 도구 추가">
                <div>
                    <button onClick={() => { analysisBoxRef.current?.addTool("video"); setToolModalOpen(false); }}>VIDEO</button>
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