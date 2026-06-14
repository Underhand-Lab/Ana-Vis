import React, { useState, useEffect, ChangeEvent } from 'react';
import Modal from '@shared/components/Modal';
import { Div, Select, Button } from '@shared/bridges/UIBridge';
import SearchableSelect from '@shared/components/SearchableSelect';
import vars from '@shared/components/ui-brick/variables';

import { useTranslation } from 'react-i18next';

interface VideoProcessorModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	analysisMap: Record<string, Record<string, any>>;
	onProcess: (type: string, modelKey: string) => void;
	isProcessing: boolean;
	progress: { current: number; total: number };
	statusKey?: string;
}

const VideoProcessorModal: React.FC<VideoProcessorModalProps> = ({
	isOpen,
	onClose,
	title = "비디오 처리",
	analysisMap = {},
	onProcess,
	isProcessing,
	progress,
	statusKey
}) => {
	const { t } = useTranslation();
	const types = Object.keys(analysisMap);
	const [selectedType, setSelectedType] = useState<string>('');
	const [selectedModel, setSelectedModel] = useState<string>('');

	// 초기값 설정 및 맵 변경 대응
	useEffect(() => {
		if (types.length > 0 && !selectedType) {
			setSelectedType(types[0]);
		}
	}, [analysisMap, types, selectedType]);

	useEffect(() => {
		if (selectedType && analysisMap[selectedType]) {
			const models = Object.keys(analysisMap[selectedType]);
			if (models.length > 0) {
				setSelectedModel(models[0]);
			}
		}
	}, [selectedType, analysisMap]);

	const handleStart = () => {
		if (selectedType && selectedModel) {
			progress.total = 0;
			onProcess(selectedType, selectedModel);
		}
	};

	const currentModels = selectedType ? Object.keys(analysisMap[selectedType] || {}) : [];

	return (
		<Modal
			isOpen={isOpen}
			onClose={() => !isProcessing && onClose()}
			title={t('navigation.newAnalysis', title)}
		>
			<Div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
				<Div style={{ display: 'flex', flexDirection: 'row', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
					<Div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
						<label htmlFor="type-select" style={{ minWidth: '80px' }}>{t('settings.analysisType', '분석 방식')}</label>
						<Select
							id="type-select"
							value={selectedType}
							onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
							disabled={isProcessing}
							options={types}
							style={{ flex: 1 }}
						/>
					</Div>

					<Div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
						<label htmlFor="model-select" style={{ minWidth: '80px' }}>{t('settings.analysisModel', '분석 모델')}</label>
						<Div style={{ 
							flex: 1, 
							opacity: (isProcessing || currentModels.length === 0) ? 0.5 : 1,
							pointerEvents: (isProcessing || currentModels.length === 0) ? 'none' : 'auto'
						}}>
							<SearchableSelect
								value={selectedModel}
								sections={[{ 
									options: currentModels.map(m => ({ label: m, value: m })) 
								}]}
								onChange={setSelectedModel}
								placeholder={t('settings.searchModel', '모델 검색...')}
							/>
						</Div>
					</Div>
				</Div>

				<Div>
					<Button
						style={{ width: '100%', margin: '0px', padding: '12px 24px', fontSize: '16px' }}
						onClick={handleStart}
						disabled={!selectedType || !selectedModel || isProcessing}
					>
						{isProcessing ? t('shared.processing', '처리 중...') : t('shared.startAnalysis', '분석 시작')}
					</Button>

					<Div id="status-section" style={{ marginTop: '15px' }}>
						<p style={{ fontSize: '14px', color: '#666' }}>
							{statusKey ? t(`status.${statusKey}`, statusKey) : ''}
							{isProcessing && progress.total > 0 && ` : ${progress.current} / ${progress.total}`}
						</p>

						<Div id="progress-bar-container" style={{
							width: 'calc(100% - 20px)', height: '10px', background: vars.surface, borderRadius: '5px', overflow: 'hidden'
						}}>
							<Div
								id="progress-bar"
								style={{
									width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
									height: '100%',
									background: vars.primary,
									transition: 'width 0.3s ease'
								}}
							></Div>
						</Div>
					</Div>
				</Div>
			</Div>
		</Modal>
	);
};

export default VideoProcessorModal;