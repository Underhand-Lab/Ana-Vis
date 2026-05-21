import React, { useState, useRef, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';
import i18n from '@packages/cv-val/core/i18n';
import enTranslation from './locales/en/translation.json';
import koTranslation from './locales/ko/translation.json';

// 다국어 번역 리소스 추가 (언어, 네임스페이스, 데이터, deepMerge여부, overwrite여부)
i18n.addResourceBundle('en', 'translation', enTranslation, true, true);
i18n.addResourceBundle('ko', 'translation', koTranslation, true, true);

import Modal from '@shared/components/Modal';
import Navigation from '@shared/bridges/NavigationBridge.tsx';
import { setThemeMode, getSystemTheme } from '@shared/components/ui-brick/variables';
import { Div, InputFile, InputSlider, FixedFooter, Box, Button, Wrapper, Select }
	from '@shared/bridges/UIBridge.ts';
import { saveBlobWithPicker } from "@shared/utils/save-blob";

import { CVValData } from '@packages/cv-val/core/cvval-data';
import { AnalysisModule } from '@packages/cv-val/types/analysis-module';
import { useProcessor } from '@packages/cv-val/hooks/useProcessor';
import { useModuleLoader } from '@packages/cv-val/hooks/useModuleLoader';

import AnalysisGridContainer from '@packages/cv-val/component/analysis-container/analysis-grid-container';
import VideoProcessorModal from '@packages/cv-val/component/video-processor-modal';
import TrackingEditorModal from '@apps/common/tracking-editor-modal';

// 레지스트리 및 훅
import { FEATURE_REGISTRY, ALL_DETECTORS, ALL_AVAILABLE_MODULES } from './FeatureRegistry';
import { useTrackBallFrame } from '@apps/features/track-ball/hooks/useTrackBallFrame';
import { useTrackBatFrame } from '@apps/features/track-bat/hooks/useTrackBatFrame';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

// 레지스트리에 등록된 모든 허용 확장자 추출 (.cvp, .cvbl, .cvbt)
const ALL_EXTENSIONS = [...Object.values(FEATURE_REGISTRY).map(cfg => cfg.extension), '.cvval', ...VIDEO_EXTENSIONS].join(',');

const AppPage: React.FC = () => {
	const { t, i18n } = useTranslation();
	const location = useLocation();
	const navigate = useNavigate();
	const state = location.state as { externalFile?: File };

	const [processedData, setProcessedData] = useState<CVValData>(() => new CVValData());
	const { status, progress, isProcessing, loadVideo, runInference, reset: resetProcessor } = useProcessor();
	const [currentIdx, setCurrentIdx] = useState(0);

	const [themeMode, setThemeModeState] = useState<'light' | 'dark'>(getSystemTheme);

	const toggleTheme = () => {
		const nextMode = themeMode === 'light' ? 'dark' : 'light';
		setThemeMode(nextMode);
		setThemeModeState(nextMode);
	};

	// 시스템 테마 변경 감지 및 자동 적용
	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent) => {
			const nextMode = e.matches ? 'dark' : 'light';
			setThemeMode(nextMode);
			setThemeModeState(nextMode);
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, []);

	// 통합 페이지에서는 기본적으로 동영상 모듈 하나를 띄워둡니다. (모든 기능에 대한 VideoPlugin을 추가한 상태)
	const [activeModules, setActiveModules] = useState<AnalysisModule<any>[]>([
		{ ...ALL_AVAILABLE_MODULES["Video"], id: `shared-video-${Date.now()}` }
	]);
	const [confValue, setConfValue] = useState(0.5);
	const [editingType, setEditingType] = useState<'ball' | 'bat' | null>(null);

	const [isProcessModalOpen, setProcessModalOpen] = useState(false);
	const [isToolModalOpen, setToolModalOpen] = useState(false);
	const [isEditorModalOpen, setEditorModalOpen] = useState(false);
	const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
	const [isEditSelectModalOpen, setEditSelectModalOpen] = useState(false);

	const dataInputRef = useRef<HTMLInputElement>(null);
	const videoInputRef = useRef<HTMLInputElement>(null);
	const pluginInputRef = useRef<HTMLInputElement>(null);

	// 공용 편집 훅 (데이터가 존재할 때만 내부적으로 레이어 생성)
	const ballFrame = useTrackBallFrame(processedData);
	const batFrame = useTrackBatFrame(processedData);

	const maxFrame = processedData ? (processedData.getFrameCnt() - 1) : 0;

	// 확장자에 따른 타입 자동 감지 로직
	const getFeatureTypeByFile = (fileName: string) => {
		const name = fileName.toLowerCase();
		if (name.endsWith('.cvp')) return 'pose';
		if (name.endsWith('.cvbl')) return 'ball';
		if (name.endsWith('.cvbt')) return 'bat';
		if (name.endsWith('.cvval')) return 'unified';
		
		if (VIDEO_EXTENSIONS.some(ext => name.endsWith(ext))) return 'video';

		return 'pose';
	};

	const loadData = useCallback(async (file: File) => {
		if (!file) return;
		const type = getFeatureTypeByFile(file.name);
		
		try {
			if (type === 'video') {
				// 동영상 파일인 경우 바로 비디오 로드 로직 수행
				const result = await loadVideo([file] as any, new CVValData());
				setProcessedData(result);
				setCurrentIdx(0);
				// 로드 후 분석 모델을 선택할 수 있도록 프로세서 모달을 엽니다.
				setProcessModalOpen(true);
				return;
			}

			const newData = new CVValData();
			
			if (type === 'unified') {
				// 신규 통합 포맷 로드
				await newData.loadFromFile(file, FEATURE_REGISTRY, loadVideo);
			} else {
				// 레거시 개별 포맷 로드
				const config = FEATURE_REGISTRY[type];
				const featureData = new config.DataClass();
				await featureData.loadFromFile(file);
				newData.set(type, featureData);
				newData.setName(file.name); // 레거시 개별 포맷 로드 시 이름 설정
				if (config.tools.length > 0) newData.addAnalysisTools(type, config.tools);
			}

			setProcessedData(newData);
			setCurrentIdx(0);
		} catch (err) { 
			console.error(err);
			alert("데이터 파일을 불러오는 데 실패했습니다."); 
		}
	}, [loadVideo]);

	useEffect(() => {
		if (state?.externalFile) {
			loadData(state.externalFile);
			navigate(location.pathname, { replace: true, state: {} });
		}
	}, [state, loadData, navigate, location.pathname]);

	const handleLoadFile = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) { await loadData(file); e.target.value = ""; }
	};

	const handleLoadModule = useModuleLoader([], (plugin) => setActiveModules(prev => [...prev, plugin]));

	const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length < 1) return;
		try {
			const result = await loadVideo(files, processedData);
			setProcessedData(result);
			setCurrentIdx(0);
			setProcessModalOpen(true);
		} catch (e) { alert("비디오 로드 중 오류 발생"); }
		finally { e.target.value = ""; }
	};

	const handleProcessVideo = async (type: string, modelKey: string) => {
		try {
			const config = FEATURE_REGISTRY[type];
			const featureData = new config.DataClass();
			const result = await runInference(ALL_DETECTORS[type][modelKey], type, processedData, featureData);
			if (config.tools.length > 0) result.addAnalysisTools(type, config.tools);
			if (featureData.setConf) featureData.setConf(config.defaultConf || 0.5);
			setProcessedData(result);
			setCurrentIdx(0);
			setProcessModalOpen(false);
		} catch (e) {
			alert("처리 중 오류 발생");
			console.log(e);
		}
	};

	const handleAddModule = (type: string) => {
		const moduleBase = ALL_AVAILABLE_MODULES[type];
		if (moduleBase) setActiveModules((prev) => [...prev, { ...moduleBase, id: `${moduleBase.id}-${Date.now()}` }]);
		setToolModalOpen(false);
	};

	const handleConfChange = (type: string, e: ChangeEvent<HTMLInputElement>) => {
		const val = parseFloat(e.target.value);
		setConfValue(val);
		if (processedData && processedData.exist(type)) {
			const featureData = processedData.get(type) as any;
			if (featureData.setConf) {
				featureData.setConf(val);
				setProcessedData(Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData));
			}
		}
	};

	const handleEditorCandidateSelect = (type: string, frameIdx: number, candIdx: number) => {
		if (processedData && processedData.exist(type)) {
			const featureData = processedData.get(type) as any;
			featureData.setSelectedIdx(frameIdx, candIdx);
			setProcessedData(Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData));
		}
	};

	const hasData = (type: string) => processedData.exist(type);

	const handleEditClick = () => {
		const ballExists = hasData('ball');
		const batExists = hasData('bat');

		if (ballExists && batExists) {
			setEditSelectModalOpen(true);
		} else if (ballExists) {
			setEditingType('ball');
			setEditorModalOpen(true);
		} else if (batExists) {
			setEditingType('bat');
			setEditorModalOpen(true);
		}
	};

	return (
		<Wrapper>
			<InputFile ref={dataInputRef} style={{ display: 'none' }} accept={ALL_EXTENSIONS} onChange={handleLoadFile} />
			<InputFile ref={videoInputRef} style={{ display: 'none' }} accept="video/*" onChange={handleVideoSelect} />
			<InputFile ref={pluginInputRef} style={{ display: 'none' }} accept=".js" onChange={handleLoadModule} />
			<Navigation
				fileButtons={[
					{ name: t('settings.title'), action: () => setSettingsModalOpen(true) },
					{ name: t('navigation.newAnalysis', '새 분석'), action: () => { if (processedData.getFrameCnt() > 0) setProcessModalOpen(true); else videoInputRef.current?.click(); } },
					...((hasData('ball') || hasData('bat')) ? [{ name: t('navigation.edit', '편집'), action: handleEditClick }] : []),
					{ name: t('navigation.load', '불러오기'), action: () => dataInputRef.current?.click() },
					{
						name: t('navigation.save', '저장'), action: async () => {
							if (!processedData || processedData.getFrameCnt() === 0) return;
							try {
								const blob = await processedData.toBlob();
								await saveBlobWithPicker(blob, processedData.getName(),
									[{ description: '통합 분석 데이터', accept: { 'application/cvval': ['.cvval'] } }], 
									true, 'cvval');
							} catch (e) {
								console.log(e);
								alert("저장 중 오류가 발생했습니다.");
							}
						}
					}
				]}
				toolButtons={Object.keys(ALL_AVAILABLE_MODULES).map(key => ({ name: `${t(`analysisTools.${key.toLowerCase()}`, key)} ${t('common.add', '추가')}`, action: () => handleAddModule(key) }))}
			/>
			<AnalysisGridContainer
				modules={activeModules}
				data={processedData} 
				currentFrame={currentIdx} 
				onRemoveModule={(id) => setActiveModules(prev => prev.filter(m => m.id !== id))} 
			/>
			<FixedFooter><Box className="container"><Div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'center'}}>
				<InputSlider min="0" max={maxFrame} step="1" value={currentIdx} onChange={setCurrentIdx} style={{ flex: 1 }} />
				<Button style={{ whiteSpace: "nowrap" }} onClick={() => setToolModalOpen(true)}>{t('common.addTool')}</Button>
			</Div></Box></FixedFooter>
			<VideoProcessorModal isOpen={isProcessModalOpen} onClose={() => setProcessModalOpen(false)} analysisMap={ALL_DETECTORS} onProcess={handleProcessVideo} isProcessing={isProcessing} progress={progress} statusKey={`label-${status}`} />
			{editingType && (<TrackingEditorModal
				isOpen={isEditorModalOpen} onClose={() => setEditorModalOpen(false)} initialFrame={currentIdx} maxFrame={maxFrame} confValue={confValue} onConfChange={(e) => handleConfChange(editingType, e)} data={processedData} type={editingType}
				getTrailLayer={editingType === 'ball' ? ballFrame.getTrailLayer : batFrame.getTrailLayer} getEditLayer={editingType === 'ball' ? ballFrame.getEditLayer : batFrame.getEditLayer} onCandidateSelect={(f, c) => handleEditorCandidateSelect(editingType, f, c)}
			/>)}
			<Modal isOpen={isEditSelectModalOpen} onClose={() => setEditSelectModalOpen(false)} title={t('navigation.selectEditTarget')}>
				<Div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
					<Div style={{ display: 'flex', flexDirection: 'row', gap: '10px', justifyContent: 'center' }}>
						<Button onClick={() => { setEditingType('ball'); setEditorModalOpen(true); setEditSelectModalOpen(false); }}>{t('navigation.editBall')}</Button>
						<Button onClick={() => { setEditingType('bat'); setEditorModalOpen(true); setEditSelectModalOpen(false); }}>{t('navigation.editBat')}</Button>
					</Div>
				</Div>
			</Modal>
			<Modal isOpen={isToolModalOpen} onClose={() => setToolModalOpen(false)} title={t('navigation.addTool')}><Div style={{ display: 'flex', flexDirection: 'column', gap: '15px', }}><Div style={{ display: 'flex', flexDirection: 'row', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', padding: '15px' }}>
				{Object.keys(ALL_AVAILABLE_MODULES).map(key => (<Button key={key} onClick={() => handleAddModule(key)}>{t(`analysisTools.${key.toLowerCase()}`, key)}</Button>))}
				<Button onClick={() => { setToolModalOpen(false); pluginInputRef.current?.click(); }}>{t('navigation.loadModule')}</Button>
			</Div></Div></Modal>
			<Modal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} title={t('settings.title')}>
				<Div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>
					<Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<span style={{ fontWeight: 'bold' }}>{t('settings.themeMode')}</span>
						<Button onClick={toggleTheme} style={{ minWidth: '120px' }}>{themeMode === 'light' ? t('settings.darkMode') : t('settings.lightMode')}</Button>
					</Div>
					<Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<span style={{ fontWeight: 'bold' }}>{t('settings.language')}</span>
						<Select
							value={i18n.language}
							onChange={(e: ChangeEvent<HTMLSelectElement>) => i18n.changeLanguage(e.target.value)}
							options={[{ label: '한국어', value: 'ko' }, { label: 'English', value: 'en' }]}
							style={{ minWidth: '120px' }}
						/>
					</Div>
				</Div>
			</Modal>
		</Wrapper>
	);
};

export default AppPage;