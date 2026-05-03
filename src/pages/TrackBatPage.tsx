import React, { useState, useRef, useCallback, useEffect, useMemo, ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NewAnalysisGridContainer from '../common/components/NewAnalysisGridContainer';
import VideoProcessorModal from '../common/components/VideoProcessorModal';
import Modal from '../common/components/Modal';
import Navigation from '../common/components/Navigation';

// 라이브러리 import
import { Processor } from '../lib/cv-val/processor';
import { TrackBatData } from "../lib/cv-val/track-bat/track-bat-data";
import * as BatDetector from '../lib/cv-val/track-bat/bat-detector/index';
import { BatDetectedObject } from '../lib/cv-val/track-bat/bat-detector/yolo';
import { AnalysisModule } from '../common/types/analysis';

import { Div, InputNumber, InputFile, Select, FixedFooter, Box, Button, Wrapper } from '../common/components/ui/UI';

import TrackBatVideoModule from "../features/track-bat/modules/TrackBatVideoModule";
import { saveBlobWithPicker } from "../common/save-blob.ts";

interface LocationState {
    externalFile?: File;
}

interface Progress {
    current: number;
    total: number;
}

type TrackBatDataWithAnalysis = TrackBatData & {
    analysisTools?: Record<string, any>;
};

// YOLO Bat Detector 설정
const DETECTORS: Record<string, BatDetector.YOLOBatDetector> = {
    "yolo11x": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11x-seg_web_model/model.json", 34),
    "yolo11l": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11l-seg_web_model/model.json", 34),
    "yolo11m": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11m-seg_web_model/model.json", 34),
    "yolo11s": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11s_web_model/model.json", 34),
    "yolo11n": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11n-seg_web_model/model.json", 34),
};

const ANALYSIS_TOOLS: Record<string, any> = {};

const AVAILABLE_MODULES: Record<string, AnalysisModule<TrackBatData, any>> = {
    "video": TrackBatVideoModule,
};

const TrackBatPage: React.FC = () => {
    const location = useLocation();
    const state = location.state as LocationState;
    const navigate = useNavigate();
    const [processedData, setProcessedData] = useState<TrackBatDataWithAnalysis | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<Progress>({ current: 0, total: 0 });
    const [statusKey, setStatusKey] = useState('label-before-process');
    const [currentIdx, setCurrentIdx] = useState(0);
    const [confValue, setConfValue] = useState(0.55); // 기본값 0.55
    const [activeModules, setActiveModules] = useState<AnalysisModule<TrackBatData, any>[]>([
        { ...TrackBatVideoModule, id: 'bat-video-default' },
    ]);

    // 후보군(Candidate) 관련 상태
    const [candidates, setCandidates] = useState<BatDetectedObject[]>([]);
    const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(-1);
    const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

    const [isProcessModalOpen, setProcessModalOpen] = useState(false);
    const [isToolModalOpen, setToolModalOpen] = useState(false);
    const dataInputRef = useRef<HTMLInputElement>(null);
    const pluginInputRef = useRef<HTMLInputElement>(null);

    // 프레임 변경 시 후보군 UI 업데이트 로직
    const updateCandidateState = useCallback((frameIdx: number) => {

        if (!processedData) return;

        setCurrentFrameIdx(frameIdx);

        const cands = processedData.getCandidatesAt(frameIdx) || [];
        const batList = processedData.getBatList();
        const frameData = batList ? batList[frameIdx] : null;
        const currentSelected = frameData ? frameData.selectedIdx : -1;

        setCandidates(cands);
        setSelectedCandidateIdx(currentSelected);
    }, [processedData]);

    // 데이터나 프레임 인덱스가 변경될 때 후보군 상태를 자동으로 동기화
    useEffect(() => {
        updateCandidateState(currentIdx);
    }, [currentIdx, updateCandidateState]);

    const maxFrame = processedData ? (processedData.getFrameCnt() - 1) : 0;

    // 공통 로드 로직 분리
    const loadTrackBatData = useCallback(async (file: File) => {
        if (!file) return;
        try {
            const data = new TrackBatData() as TrackBatDataWithAnalysis;
            await data.loadFromFile(file);
            setProcessedData(data);
            setCurrentIdx(0);
        } catch (err) {
            alert("데이터 파일을 불러오는 데 실패했습니다.");
        }
    }, []);

    // 외부 파일 전달 감지
    useEffect(() => {
        if (state?.externalFile) {
            const file = state.externalFile;

            // 상태 소모 후 즉시 초기화
            navigate(location.pathname, { replace: true, state: {} });

            loadTrackBatData(file);
        }
    }, [state, loadTrackBatData, navigate, location.pathname]);

    // 수동 데이터 불러오기 핸들러
    const handleLoadFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await loadTrackBatData(file);
            e.target.value = "";
        }
    };

    // 플러그인 파일 불러오기 핸들러 (.js)
    const handleLoadPlugin = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target?.result as string;
                    // eslint-disable-next-line no-new-func
                    const plugin = new Function('React', 'AnalysisTools', `return ${content}`)(React, ANALYSIS_TOOLS);
                    
                    if (plugin && plugin.View && plugin.title) {
                        setActiveModules(prev => [...prev, { ...plugin, id: `plugin-${Date.now()}` }]);
                    } else {
                        throw new Error("Invalid format");
                    }
                } catch (err) {
                    alert("플러그인 로드 실패");
                }
            };
            reader.readAsText(file);
            e.target.value = "";
        }
    };

    // 비디오 처리 실행
    const handleProcessVideo = async (files: FileList, model: string) => {

        if (!files || files.length < 1) return;

        setProgress({ current: 0, total: 0 });
        setIsProcessing(true);
        const processor = new Processor();
        try {
            processor.setting(DETECTORS[model], {
                onState: (state: string) => setStatusKey(`label-${state}`),
                onProgress: (current: number, total: number) => setProgress({ current, total })
            });
            const result = await processor.processVideo(files, new TrackBatData()) as TrackBatDataWithAnalysis;
            result.setConf(confValue); // 데이터 처리 직후 UI의 CONF 값 적용
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
    const handleAddModule = (type: string) => {
        const moduleBase = AVAILABLE_MODULES[type];
        if (moduleBase) {
            setActiveModules((prev: AnalysisModule<TrackBatData, any>[]) => [
                ...prev,
                { ...moduleBase, id: `${type}-${Date.now()}` }
            ]);
        }
        setToolModalOpen(false);
    };

    // 분석 도구(모듈) 삭제 핸들러
    const handleRemoveModule = (id: string) => {
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
    const handleConfChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setConfValue(val);
        if (processedData) {
            processedData.setConf(val);
            // 참조를 변경하여 하위 모듈의 리렌더링을 유도합니다.
            const newData = Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData);
            setProcessedData(newData);
        }
    };

    // 후보군 선택 변경 로직 분리
    const updateCandidateSelection = (idx: number) => {
        setSelectedCandidateIdx(idx);
        if (processedData) {
            processedData.setSelectedIdx(currentFrameIdx, idx);
            // 참조를 변경하여 하위 모듈의 리렌더링을 유도합니다.
            const newData = Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData);
            setProcessedData(newData);
        }
    };

    const handleCandidateChange = (e: ChangeEvent<HTMLSelectElement>) => {
        updateCandidateSelection(parseInt(e.target.value, 10));
    };

    const candidateOptions = useMemo(() => [
        { label: "none", value: -1 },
        ...candidates.map((cand, i) => ({
            label: `${i + 1} (${(cand.confidence * 100).toFixed(0)}%)`,
            value: i
        }))
    ], [candidates]);

    return (
        <Wrapper>
            <InputFile ref={dataInputRef} style={{ display: 'none' }} accept=".cvbt" onChange={handleLoadFile} />
            <InputFile 
                ref={pluginInputRef} 
                style={{ display: 'none' }} 
                accept=".js" 
                onChange={handleLoadPlugin} 
            />

            <Navigation
                fileButtons={[
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
                ]}
                toolButtons={Object.keys(AVAILABLE_MODULES).map(key => ({
                    name: `${key} 추가`,
                    action: () => handleAddModule(key)
                }))}
            />

            <NewAnalysisGridContainer
                modules={activeModules}
                data={processedData}
                currentFrame={currentIdx}
                onRemoveModule={handleRemoveModule}
            />

            <FixedFooter>
                <Box className="container">
                    <Div className="Divide" style={{ display: 'flex', flexDirection: 'row', gap: '20px', }}>
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

                        <Button style={{ whiteSpace: "nowrap" }} onClick={() => setToolModalOpen(true)}>
                            도구 추가
                        </Button>
                    </Div>
                    <Div style={{ display: 'flex', gap: '10px' }}>

                        {/* CONF 입력 UI */}
                        <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <label htmlFor="confInput">CONF: </label>
                            <InputNumber
                                id="confInput"
                                value={confValue}
                                step="0.01"
                                min="0" max="1"
                                onChange={handleConfChange}
                                style={{ width: '60px' }}
                            />
                        </Div>

                        {/* 후보군 선택 UI (Candidate Select) */}
                        <Div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <label>선택: </label>
                            <Div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <Button
                                    style={{ padding: '0 8px', height: '30px', minWidth: '30px' }}
                                    onClick={() => {
                                        const nextIdx = selectedCandidateIdx <= -1 ? candidates.length - 1 : selectedCandidateIdx - 1;
                                        updateCandidateSelection(nextIdx);
                                    }}
                                >
                                    &lt;
                                </Button>
                                <Select
                                    value={selectedCandidateIdx}
                                    onChange={handleCandidateChange}
                                    options={candidateOptions}
                                />
                                <Button
                                    style={{ padding: '0 8px', height: '30px', minWidth: '30px' }}
                                    onClick={() => {
                                        const nextIdx = selectedCandidateIdx >= candidates.length - 1 ? -1 : selectedCandidateIdx + 1;
                                        updateCandidateSelection(nextIdx);
                                    }}
                                >
                                    &gt;
                                </Button>
                            </Div>
                        </Div>

                    </Div>
                    <Div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                    </Div>
                </Box>
            </FixedFooter>

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
                <Div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <Div style={{
                        display: 'flex', flexDirection: 'row',
                        gap: '5px', justifyContent: 'center', flexWrap: 'wrap'
                    }}>
                        {Object.keys(AVAILABLE_MODULES).map(key => (
                            <Div key={key}>
                                <Button onClick={() => handleAddModule(key)}>
                                    {key.toUpperCase()}
                                </Button>
                            </Div>
                        ))
                        }<Button onClick={() => { setToolModalOpen(false); pluginInputRef.current?.click(); }}>
                            플러그인 파일 불러오기 (.js)
                        </Button>
                    </Div>
                </Div>
            </Modal>
        </Wrapper>
    );
};

export default TrackBatPage;