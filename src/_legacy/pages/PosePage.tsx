import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Modal from '@common/components/Modal';
import Navigation from '@common/bridges/NavigationBridge.tsx';
import { Div, InputFile, InputSlider, FixedFooter, Box, Button, Wrapper }
	from '@common/bridges/UIBridge.ts';
import { saveBlobWithPicker } from "@/common/utils/save-blob";

import { CVValData, IAnalysisTool } from '@features/cv-val/core/cvval-data';
import { AnalysisModule } from '@features/cv-val/types/analysis-module';

import { useProcessor } from '@features/cv-val/hooks/useProcessor';
import { usePluginLoader } from '@features/cv-val/hooks/usePluginLoader';

import AnalysisGridContainer from '@features/cv-val/component/analysis-container/AnalysisGridContainer';
import VideoProcessorModal from '@features/cv-val/component/VideoProcessorModal';

import { VideoModuleBuilder } from '@features/cv-val/modules/VideoModule';
import GraphModule from '@features/cv-val/modules/GraphModule';
import TableModule from '@features/cv-val/modules/TableModule';

import { PoseData } from '@features/pose/core/pose-data';
import * as PoseDetector from '@features/pose/core/pose-detector';
import * as PoseAnalysisTool from "@features/pose/tool";

import { PoseVideoPlugin } from '@/features/pose/plugin/PoseVideoPlugin';
import Pose3DVideoModule from '@features/pose/modules/Pose3DVideoModule';

interface LocationState {
	externalFile?: File;
}

// 정적 설정값
const DETECTORS: Record<string, any> = {
	"mediapipe_heavy": new PoseDetector.MediaPipePoseDetector("./external/models/mediapipe/pose_landmarker_heavy.task"),
	"mediapipe_full": new PoseDetector.MediaPipePoseDetector("./external/models/mediapipe/pose_landmarker_full.task"),
	"mediapipe_lite": new PoseDetector.MediaPipePoseDetector("./external/models/mediapipe/pose_landmarker_lite.task"),
};

const ANALYSIS_TOOLS: IAnalysisTool[] = [
	new PoseAnalysisTool.AngleAnalysisTool(),
	new PoseAnalysisTool.AngleVelocityAnalysisTool(),
	new PoseAnalysisTool.VelocityAnalysisTool(),
	new PoseAnalysisTool.HeightAnalysisTool(),
	new PoseAnalysisTool.GRFAnalysisTool(),
];

const AVAILABLE_MODULES: Record<string, AnalysisModule<any>> = {
	"동영상": new VideoModuleBuilder().addPlugin(new PoseVideoPlugin()).build(),
	"3D 동영상": Pose3DVideoModule,
	"그래프": GraphModule,
	"표": TableModule,
};

const PosePage: React.FC = () => {
	const location = useLocation();
	const state = location.state as LocationState;
	const navigate = useNavigate();
	const [processedData, setProcessedData] = useState<CVValData | null>(null);
	const { status, progress, isProcessing, processVideo, reset: resetProcessor } = useProcessor();
	const [currentIdx, setCurrentIdx] = useState(0);
	const [activeModules, setActiveModules] = useState<AnalysisModule<any>[]>([
		{ ...AVAILABLE_MODULES["동영상"], id: 'video-default' },
		{ ...AVAILABLE_MODULES["그래프"], id: 'graph-default' }
	]);

	const [isProcessModalOpen, setProcessModalOpen] = useState(false);
	const [isToolModalOpen, setToolModalOpen] = useState(false);

	const analysisBoxRef = useRef<HTMLDivElement>(null);
	const dataInputRef = useRef<HTMLInputElement>(null);
	const pluginInputRef = useRef<HTMLInputElement>(null);

	// 데이터의 총 프레임 수를 계산 (processedData.length 가 존재한다고 가정)
	const maxFrame = processedData ? (processedData.getFrameCnt() - 1) : 0;

	// 공통 로드 로직 분리
	const loadPoseData = useCallback(async (file: File) => {
		if (!file) return;
		try {
			const data = new CVValData();
			const pdata = new PoseData();
			await pdata.loadFromFile(file); // data.analysisTools는 loadFromFile에서 복원되지 않으므로, 명시적으로 할당
			data.set('pose', pdata);
			data.addAnalysisTools('pose', ANALYSIS_TOOLS);
			setProcessedData(data);
			setCurrentIdx(0); // 데이터 로드 시 인덱스 초기화
		} catch (err) {
			console.error("파일 로드 실패:", err);
			alert("데이터 파일을 불러오는 데 실패했습니다.");
		}
	}, []);

	// 외부에서 파일이 전달된 경우 (더블 클릭 등) 감지
	useEffect(() => {
		if (state?.externalFile) {
			const file = state.externalFile;

			// 파일 로드 전 state를 즉시 비워 중복 실행 방지
			navigate(location.pathname, { replace: true, state: {} });

			loadPoseData(file);
		}
	}, [state, loadPoseData, navigate, location.pathname]);

	// 파일 불러오기 핸들러 (.cvp)
	const handleLoadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			await loadPoseData(file);
			e.target.value = "";
		}
	};

	const handleLoadPlugin = usePluginLoader(ANALYSIS_TOOLS, (plugin) => {
		setActiveModules(prev => [...prev, plugin]);
	});

	// 비디오 처리 핸들러
	const handleProcessVideo = async (files: FileList, model: string) => {
		if (!files || files.length < 1) return;

		try {
			const data = await processVideo(
				DETECTORS[model], files, 'pose', new CVValData(), new PoseData()
			);

			data.addAnalysisTools('pose', ANALYSIS_TOOLS);
			
			setProcessedData(data);
			setCurrentIdx(0); // 처리 완료 시 인덱스 초기화
			setProcessModalOpen(false);
		} catch (e) {
			console.error(e);
			alert("처리 중 오류가 발생했습니다.");
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

	return (
		<Wrapper>
			<InputFile
				ref={dataInputRef}
				style={{ display: 'none' }}
				accept=".cvp"
				onChange={handleLoadFile}
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
						name: "새 분석", action: () => {
							resetProcessor();
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
				]}
				toolButtons={Object.keys(AVAILABLE_MODULES).map(key => ({
					name: `${key} 추가`,
					action: () => handleAddModule(key)
				}))}
			/>

			{/* 그리드 컨테이너: currentIdx와 data를 prop으로 직접 전달 */}
			<AnalysisGridContainer
				modules={activeModules}
				data={processedData}
				currentFrame={currentIdx}
				onRemoveModule={handleRemoveModule}
			/>

			{/* 하단 컨트롤러 영역 */}
			<FixedFooter>
				<Box className="container">
					<Div className="Divide" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
						<Div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
							<InputSlider
								id="frameSlider"
								min="0"
								max={maxFrame}
								step="1"
								value={currentIdx}
								onChange={setCurrentIdx}
								style={{ flex: 1 }}
							/>
						</Div>

						<Button
							className="neumorphism-Button"
							onClick={() => setToolModalOpen(true)}
						>
							도구 추가
						</Button>
					</Div>
				</Box>
			</FixedFooter>

			<VideoProcessorModal
				isOpen={isProcessModalOpen}
				onClose={() => setProcessModalOpen(false)}
				models={Object.keys(DETECTORS)}
				defaultModel={"mediapipe_full"}
				onProcess={handleProcessVideo}
				isProcessing={isProcessing}
				progress={progress}
				statusKey={`label-${status}`}
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

export default PosePage;