import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import enTranslation from './locales/en/translation.json';
import koTranslation from './locales/ko/translation.json';

import { Box, Button, Div, FixedFooter, InputFile, InputSlider, Wrapper } from '@shared/bridges/UIBridge.ts';
import i18n from '@shared/utils/i18n';
import { saveBlobWithPicker } from "@shared/utils/save-blob";

i18n.addResourceBundle('en', 'translation', enTranslation, true, true);
i18n.addResourceBundle('ko', 'translation', koTranslation, true, true);

import { useModuleLoader } from '@cv-val/hooks/useModuleLoader';
import PanelModuleContainer from '@packages/cv-val/component/panel-module-container/PanelModuleContainer';

import Navigation from '@apps/common/bridges/NavigationBridge';
import VideoProcessorModal from '@packages/cv-val/component/VideoProcessorModal';
import { ToolAddModal, AppSettingsModal } from '@apps/features/app/components';

import { useAppLogic } from '@apps/features/app/hooks/useAppLogic';

import { ALL_AVAILABLE_MODULES, ALL_DETECTORS } from '../FeatureRegistry';
import { vars, getSystemTheme, setThemeMode, setGlobalFont } from '@shared/bridges/UIBridge.ts';

const ALL_EXTENSIONS = '.cvp,.cvbl,.cvbt,.cvval,.mp4,.mov,.avi,.mkv,.webm';

const AppPage: React.FC = () => {
	const { t } = useTranslation();
	const logic = useAppLogic();
	const [isProcessModalOpen, setProcessModalOpen] = useState(false);
	const [isToolModalOpen, setToolModalOpen] = useState(false);
	const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
	const [toolModalResolve, setToolModalResolve] = useState<((value: string | undefined) => void) | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	// 전역 UI 상태를 AppPage에서 관리
	const [themeMode, setThemeModeState] = useState<'light' | 'dark'>(getSystemTheme);
	const [currentFont, setCurrentFont] = useState(vars.font);

	const dataInputRef = useRef<HTMLInputElement | null>(null);
	const videoInputRef = useRef<HTMLInputElement | null>(null);
	const pluginInputRef = useRef<HTMLInputElement | null>(null);
	const handleLoadModule = useModuleLoader([], (plugin) => {
		logic.setActiveModules(prev => [...prev, plugin]);
		// 로컬 스토리지에 플러그인 정보 저장
		const saved = localStorage.getItem('cvval_local_plugins');
		const plugins = saved ? JSON.parse(saved) : [];
		if (!plugins.find((p: any) => p.id === plugin.type)) {
			const updated = [...plugins, { id: plugin.type, title: plugin.title }];
			localStorage.setItem('cvval_local_plugins', JSON.stringify(updated));
			window.dispatchEvent(new Event('cvval_plugins_updated'));
		}
	});

	const currentIdxRef = useRef(logic.currentIdx);
	useEffect(() => { currentIdxRef.current = logic.currentIdx; }, [logic.currentIdx]);

	useEffect(() => {
		let interval: any;
		if (isPlaying && logic.processedData && logic.processedData.getFrameCnt() > 0) {
			const fps = (logic.processedData as any).getFPS?.() || 30;
			const maxFrame = logic.processedData.getFrameCnt() - 1;
			interval = setInterval(() => {
				const nextIdx = currentIdxRef.current + 1;
				if (nextIdx > maxFrame) setIsPlaying(false);
				else logic.setCurrentIdx(nextIdx);
			}, 1000 / fps);
		}
		return () => clearInterval(interval);
	}, [isPlaying, logic.processedData, logic.setCurrentIdx]);

	const handleTogglePlay = () => {
		const frameCnt = logic.processedData ? logic.processedData.getFrameCnt() : 0;
		if (frameCnt <= 0) return;

		const maxFrame = frameCnt - 1;
		if (!isPlaying && logic.currentIdx >= maxFrame) {
			logic.setCurrentIdx(0);
		}
		setIsPlaying(!isPlaying);
	};

	const handlePrevFrame = () => {
		const frameCnt = logic.processedData ? logic.processedData.getFrameCnt() : 0;
		if (frameCnt <= 0) return;
		setIsPlaying(false);
		logic.setCurrentIdx(Math.max(0, logic.currentIdx - 1));
	};

	const handleNextFrame = () => {
		const frameCnt = logic.processedData ? logic.processedData.getFrameCnt() : 0;
		if (frameCnt <= 0) return;
		setIsPlaying(false);
		const maxFrame = frameCnt - 1;
		logic.setCurrentIdx(Math.min(maxFrame, logic.currentIdx + 1));
	};

	// 도구 선택 모달을 열고 선택 결과를 Promise로 반환하는 함수
	const openToolSelectionModal = (): Promise<string | undefined> => {
		return new Promise((resolve) => {
			setToolModalResolve(() => resolve);
			setToolModalOpen(true);
		});
	};

	// 모달에서 도구가 선택되었을 때 호출되는 핸들러
	const handleToolModalSelection = (selectedKey: string | undefined) => {
		if (toolModalResolve) {
			toolModalResolve(selectedKey);
			setToolModalResolve(null);
		}
		setToolModalOpen(false);
	};

	return (
		<Wrapper style={{ fontFamily: currentFont }}>
			<InputFile ref={dataInputRef} style={{ display: 'none' }} accept={ALL_EXTENSIONS} onChange={async (e) => {
				const file = e.target.files?.[0]; if (file) { const res = await logic.loadData(file); if (res === "openProcessModal") setProcessModalOpen(true); }
			}} />
			<InputFile ref={videoInputRef} style={{ display: 'none' }} accept="video/*" onChange={async (e) => {
				if (await logic.handleVideoSelect(e.target.files)) setProcessModalOpen(true); e.target.value = "";
			}} />
			<InputFile ref={pluginInputRef} style={{ display: 'none' }} accept=".js" onChange={handleLoadModule} />
			<Navigation
				fileButtons={[
					{ name: t('settings.title'), action: () => setSettingsModalOpen(true) },
					{ name: t('navigation.newAnalysis', '새 분석'), action: () => { if (logic.processedData.getFrameCnt() > 0) setProcessModalOpen(true); else videoInputRef.current?.click(); } },
					{ name: t('navigation.load', '불러오기'), action: () => dataInputRef.current?.click() },
					{
						name: t('navigation.save', '저장'), action: async () => {
							if (!logic.processedData || logic.processedData.getFrameCnt() === 0) return;
							try {
								const blob = await logic.processedData.toBlob();
								await saveBlobWithPicker(blob, logic.processedData.getName(),
									[{ description: '통합 분석 데이터', accept: { 'application/cvval': ['.cvval'] } }],
									true, 'cvval');
							} catch (e) { alert("저장 중 오류가 발생했습니다."); }
						}
					}
				]}
				toolButtons={Object.keys(ALL_AVAILABLE_MODULES).map(key => ({ name: `${t(`analysisTools.${key.toLowerCase()}`, key)} ${t('common.add', '추가')}`, action: () => logic.handleAddModule(key) }))}
			/>
			<PanelModuleContainer
				modules={logic.activeModules}
				moduleRegistry={ALL_AVAILABLE_MODULES}
				data={logic.processedData}
				currentFrame={logic.currentIdx}
				onNextFrame={handleNextFrame}
				onCandidateSelect={(frameIdx, candidateIdx, type) => {
					if (!type) return;
					logic.handleEditorCandidateSelect(type, frameIdx, candidateIdx);
				}}
				onReorderModules={logic.setActiveModules}
				onAddModule={async () => {
					const selectedModuleKey = await openToolSelectionModal(); // selectedModuleKey는 모듈 타입 (예: 'pose')
					if (selectedModuleKey) {
						// logic.handleAddModule should return the newly created module
						return logic.handleAddModule(selectedModuleKey);
					}
					return undefined; // If no module selected, return undefined
				}}
			/>
			<FixedFooter><Box className="container"><Div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
				<Div style={{ display: 'flex', gap: '8px', alignItems: 'center'}}>
					<Button
						onClick={handlePrevFrame}
						style={{ fontSize: '10px', width: '28px', height: '28px', padding: 0, alignItems: 'center' , fontFamily: 'Default' }}
					>
						{'❮'}
					</Button>
					<Button
						onClick={handleTogglePlay}
						style={{ fontSize: '12px', width: '30px', height: '30px', padding: 0, alignItems: 'center' , fontFamily: 'Default' }}
					>
						{isPlaying ? '⏸' : '▶'}
					</Button>
					<Button
						onClick={handleNextFrame}
						style={{ fontSize: '10px', width: '28px', height: '28px', padding: 0, alignItems: 'center' , fontFamily: 'Default' }}
					>
						{'❯'}
					</Button>
				</Div>
				<InputSlider
					min="0"
					max={logic.processedData ? logic.processedData.getFrameCnt() - 1 : 0}
					step="1"
					value={logic.currentIdx}
					onChange={(val) => { setIsPlaying(false); logic.setCurrentIdx(val); }}
					style={{ flex: 1 }}
				/>
			</Div></Box></FixedFooter><VideoProcessorModal
				isOpen={isProcessModalOpen}
				onClose={() => setProcessModalOpen(false)}
				analysisMap={ALL_DETECTORS}
				onCancel={logic.cancelProcessing}
				onProcess={async (type, model) => {
					try {
						await logic.handleProcessVideo(type, model);
						setProcessModalOpen(false);
					} catch (error) {
						console.error(error);
					}
				}}
				isProcessing={logic.isProcessing}
				progress={logic.progress}
				statusKey={`label-${logic.status}`}
				errorMessage={logic.errorMessage}
			/>

			<ToolAddModal
				isOpen={isToolModalOpen}
				onClose={() => handleToolModalSelection(undefined)}
				onToolSelect={handleToolModalSelection}
				pluginInputRef={pluginInputRef}
			/>

			<AppSettingsModal
				isOpen={isSettingsModalOpen}
				onClose={() => setSettingsModalOpen(false)}
				themeMode={themeMode}
				toggleTheme={() => {
					const next = themeMode === 'light' ? 'dark' : 'light';
					setThemeMode(next);
					setThemeModeState(next);
				}}
				font={currentFont}
				setFont={(f: string) => {
					setGlobalFont(f);
					setCurrentFont(f);
				}}
			/>
		</Wrapper>
	);
};

export default AppPage;
