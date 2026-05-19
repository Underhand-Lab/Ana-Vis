import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '@common/components/Modal';
import Navigation from '@common/bridges/NavigationBridge.tsx';
import { saveBlobWithPicker } from "@/common/utils/save-blob";

import {
    Div, InputFile, InputSlider,
    FixedFooter, Box, Button, Wrapper
}
    from '@common/bridges/UIBridge.ts';

// 라이브러리 import
import { CVValData, IAnalysisTool } from '@/features/cv-val/core/cvval-data';
import { AnalysisModule } from '@features/cv-val/types/analysis-module';

import { useProcessor } from '@features/cv-val/hooks/useProcessor';
import { usePluginLoader } from '@features/cv-val/hooks/usePluginLoader';

import AnalysisGridContainer from '@features/cv-val/component/analysis-container/AnalysisGridContainer';
import VideoProcessorModal from '@features/cv-val/component/VideoProcessorModal';
import TrackingEditorModal from '@features/cv-val/component/TrackingEditorModal';

import { VideoModuleBuilder } from '@/features/cv-val/modules/VideoModule';
import TableModule from "@features/cv-val/modules/TableModule"

import { TrackBallData } from "@features/track-ball/core/track-ball-data";
import * as BallDetector from '@features/track-ball/core/ball-detector/index';
import { DetectedObject } from '@features/track-ball/types';
import * as Analysis from "@features/track-ball/tool/analysis";
import { useTrackBallFrame } from '@features/track-ball/hooks/useTrackBallFrame';

import { TrackBallVideoPlugin } from '@/features/track-ball/plugin/TrackBallVideoPlugin';


interface LocationState {
    externalFile?: File;
}

// YOLO 탐지기 설정
const DETECTORS: Record<string, BallDetector.YOLOBallDetector> = {
    "yolo11x": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11x_web_model/model.json", 32),
    "yolo11l": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11l_web_model/model.json", 32),
    "yolo11m": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11m_web_model/model.json", 32),
    "yolo11s": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11s_web_model/model.json", 32),
    "yolo11n": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11n_web_model/model.json", 32),
};

const ANALYSIS_TOOLS: IAnalysisTool[] = [
    new Analysis.BallAnalysisTool()
]

const AVAILABLE_MODULES: Record<string, AnalysisModule<any>> = {
    "video": new VideoModuleBuilder()
        .addPlugin(new TrackBallVideoPlugin())
        .build(),
    "table": TableModule
};

const TrackBallPage: React.FC = () => {
    const location = useLocation();
    const state = location.state as LocationState;
    const navigate = useNavigate();
    const [processedData, setProcessedData] = useState<CVValData>(() => new CVValData());
    const { status, progress, isProcessing, loadVideo, runInference, reset: resetProcessor } = useProcessor();
    const [currentIdx, setCurrentIdx] = useState(0);
    const [confValue, setConfValue] = useState(0.01);
    const [activeModules, setActiveModules] = useState<AnalysisModule<any>[]>([
        { ...AVAILABLE_MODULES['video'], id: 'video-default' },
        { ...AVAILABLE_MODULES['table'], id: 'table-default' }
    ]);

    // 편집용 독립 인덱스 및 시각화 훅
    const { getTrailLayer, getEditLayer } = useTrackBallFrame(processedData);

    // 후보군(Candidate) UI 상태 관리
    const [candidates, setCandidates] = useState<DetectedObject[]>([]);
    const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(-1);
    const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

    const [isProcessModalOpen, setProcessModalOpen] = useState(false);
    const [isToolModalOpen, setToolModalOpen] = useState(false);
    const [isEditorModalOpen, setEditorModalOpen] = useState(false);

    const analysisBoxRef = useRef<HTMLDivElement>(null);
    const dataInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const pluginInputRef = useRef<HTMLInputElement>(null);

    // 프레임 변경 시 후보군 UI 갱신 (기존 updateCandidateUI 로직)
    const updateCandidateState = useCallback((frameIdx: number) => {

        if (!processedData || !processedData.exist('ball')) return;

        setCurrentFrameIdx(frameIdx);

        const ballData = processedData.get('ball') as TrackBallData;

        const cands = ballData.getCandidatesAt(frameIdx) || [];
        const ballList = ballData.getBallList();
        const frameData = ballList ? ballList[frameIdx] : null;
        const currentSelected = frameData ? frameData.selectedIdx : -1;

        setCandidates(cands);
        setSelectedCandidateIdx(currentSelected);
    }, [processedData]);

    // 데이터나 프레임 인덱스가 변경될 때 후보군 상태를 자동으로 동기화 (프레임이 있을 때만 실행)
    useEffect(() => {
        updateCandidateState(currentIdx);
    }, [currentIdx, updateCandidateState]);

    const maxFrame = processedData ? (processedData.getFrameCnt() - 1) : 0;

    // 공통 로드 로직 분리
    const loadTrackBallData = useCallback(async (file: File) => {
        if (!file) return;
        try {
            const data = new CVValData();
            const bdata = new TrackBallData();
            await bdata.loadFromFile(file);
            data.set('ball', bdata);
            data.addAnalysisTools('ball', ANALYSIS_TOOLS); // 데이터 로드 즉시 도구 주입
            setProcessedData(data);
            setCurrentIdx(0);
        } catch (err) {
            console.error(err);
            alert("데이터 파일을 불러오는 데 실패했습니다.");
        }
    }, []);

    // 외부 파일 전달 감지
    useEffect(() => {
        if (state?.externalFile) {
            const file = state.externalFile;

            // 상태 소모 후 즉시 초기화
            navigate(location.pathname, { replace: true, state: {} });

            loadTrackBallData(file);
        }
    }, [state, loadTrackBallData, navigate, location.pathname]);

    // 수동 파일 불러오기 핸들러
    const handleLoadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await loadTrackBallData(file);
            e.target.value = "";
        }
    };

    const handleLoadPlugin = usePluginLoader(ANALYSIS_TOOLS, (plugin) => {
        setActiveModules(prev => [...prev, plugin]);
    });

    // 1단계: 비디오 파일 선택 및 프레임 로드
    const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length < 1) return;

        try {
            // 고정된 CVValData 인스턴스에 비디오 프레임을 로드합니다.
            const result = await loadVideo(files, processedData);
            setProcessedData(result);
            setCurrentIdx(0);
            setProcessModalOpen(true); // 로드 완료 후 모델 설정 모달 오픈
        } catch (e) {
            alert("비디오 로드 중 오류 발생");
        } finally {
            e.target.value = "";
        }
    };

    // 3단계 & 4단계: 분석 실행 및 결과 추가
    const handleProcessVideo = async (type: string, modelKey: string) => {
        try {
            const trackBallData = new TrackBallData();
            const result = await runInference(DETECTORS[modelKey], type, processedData, trackBallData);

            result.addAnalysisTools(type, ANALYSIS_TOOLS);
            trackBallData.setConf(confValue); // 데이터 처리 직후 UI의 CONF 값 적용
            setProcessedData(result);
            setCurrentIdx(0);
            setProcessModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("비디오 처리 중 오류 발생");
        }
    };

    // 분석 도구(모듈) 추가 핸들러
    const handleAddModule = (type: string) => {
        const moduleBase = AVAILABLE_MODULES[type];
        if (moduleBase) {
            setActiveModules((prev: AnalysisModule<any>[]) => [
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

    // CONF 변경 핸들러
    const handleConfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setConfValue(val);
        if (processedData) {
            const ballData = processedData.get('ball') as TrackBallData;
            ballData.setConf(val);
            // 참조를 변경하여 하위 모듈(Video, Table)의 리렌더링을 유도합니다.
            const newData = Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData);
            setProcessedData(newData);
        }
    };

    // 후보군 선택 변경 로직 분리
    const updateCandidateSelection = (idx: number) => {
        setSelectedCandidateIdx(idx);
        if (processedData) {
            const ballData = processedData.get('ball') as TrackBallData;
            ballData.setSelectedIdx(currentFrameIdx, idx);
            // 참조를 변경하여 하위 모듈의 리렌더링을 유도합니다.
            const newData = Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData);
            setProcessedData(newData);
        }
    };

    const handleEditorCandidateSelect = (frameIdx: number, candIdx: number) => {
        if (processedData) {
            const ballData = processedData.get('ball') as TrackBallData;
            ballData.setSelectedIdx(frameIdx, candIdx);
            const newData = Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData);
            setProcessedData(newData);
        }
    };

    const handleCandidateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
            {/* 데이터 불러오기용 숨겨진 input */}
            <InputFile
                ref={dataInputRef}
                style={{ display: 'none' }}
                accept=".cvbl"
                onChange={handleLoadFile}
            />
            <InputFile
                ref={videoInputRef}
                style={{ display: 'none' }}
                accept="video/*"
                onChange={handleVideoSelect}
            />
            <InputFile
                ref={pluginInputRef}
                style={{ display: 'none' }}
                accept=".js"
                onChange={handleLoadPlugin}
            />

            <Navigation
                fileButtons={[
                    {
                        name: "새 분석",
                        action: () => {
                            resetProcessor();
                            // 이미지 리스트가 이미 존재하면 바로 모델 설정 모달을 열고, 없으면 비디오 선택을 유도합니다.
                            if (processedData.getFrameCnt() > 0) {
                                setProcessModalOpen(true);
                            } else {
                                videoInputRef.current?.click();
                            }
                        }
                    },
                    {
                        name: "편집", action: () => {
                            setEditorModalOpen(true);
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
                ]}
                toolButtons={Object.keys(AVAILABLE_MODULES).map(key => ({
                    name: `${key} 추가`,
                    action: () => handleAddModule(key)
                }))}
            />

            <AnalysisGridContainer
                modules={activeModules}
                data={processedData}
                currentFrame={currentIdx}
                onRemoveModule={handleRemoveModule}
            />

            <FixedFooter>
                <Box className="container">
                    <Div className="Divide" style={{ display: 'flex', flexDirection: 'row', gap: '20px', }}>
                        <InputSlider
                            id="frameSlider"
                            min="0"
                            max={maxFrame}
                            step="1"
                            value={currentIdx}
                            onChange={setCurrentIdx}
                            style={{ flex: 1 }}
                        />

                        <Button style={{ whiteSpace: "nowrap" }} onClick={() => setToolModalOpen(true)}>
                            도구 추가
                        </Button>
                    </Div>
                    <Div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                    </Div>
                </Box>
            </FixedFooter>

            {/* 모달: 비디오 분석 */}

            <VideoProcessorModal
                isOpen={isProcessModalOpen}
                onClose={() => setProcessModalOpen(false)}
                analysisMap={{ ball: DETECTORS }}
                onProcess={handleProcessVideo}
                isProcessing={isProcessing}
                progress={progress}
                statusKey={`label-${status}`}
            />

            <TrackingEditorModal
                isOpen={isEditorModalOpen}
                onClose={() => setEditorModalOpen(false)}
                initialFrame={currentIdx}
                maxFrame={maxFrame}
                confValue={confValue}
                onConfChange={handleConfChange}
                data={processedData}
                type={'ball'}
                getTrailLayer={getTrailLayer}
                getEditLayer={getEditLayer}
                onCandidateSelect={handleEditorCandidateSelect}
            />

            {/* 모달: 도구 추가 */}
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
                        ))}
                        <Button onClick={() => { setToolModalOpen(false); pluginInputRef.current?.click(); }}>
                            플러그인 파일 불러오기 (.js)
                        </Button>
                    </Div>
                </Div>
            </Modal>
        </Wrapper>
    );
};

export default TrackBallPage;