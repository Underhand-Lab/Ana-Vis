import React, { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import { Div, Button, Select } from '@shared/bridges/UIBridge';
import VideoProcessorModal from '@packages/cv-val/component/VideoProcessorModal';
import { ALL_DETECTORS, ALL_AVAILABLE_MODULES } from '../../../FeatureRegistry';
import { AppLogic } from '../hooks/useAppLogic';

interface AppModalsProps {
  logic: AppLogic;
  ui: {
    isProcessModalOpen: boolean; setProcessModalOpen: (v: boolean) => void;
    isToolModalOpen: boolean; setToolModalOpen: (v: boolean) => void;
    isSettingsModalOpen: boolean; setSettingsModalOpen: (v: boolean) => void;
    themeMode: string; toggleTheme: () => void;
  };
  pluginInputRef: React.RefObject<HTMLInputElement | null>;
  onToolSelect: (selectedKey: string | undefined) => void;
}

const AppModals: React.FC<AppModalsProps> = ({ logic, ui, pluginInputRef, onToolSelect }) => {
  const { t, i18n } = useTranslation();

  return (
    <>
      <VideoProcessorModal 
        isOpen={ui.isProcessModalOpen} 
        onClose={() => ui.setProcessModalOpen(false)} 
        analysisMap={ALL_DETECTORS} 
        onProcess={async (type, model) => { await logic.handleProcessVideo(type, model); ui.setProcessModalOpen(false); }} 
        isProcessing={logic.isProcessing} 
        progress={logic.progress} 
        statusKey={`label-${logic.status}`} 
      />

      <Modal isOpen={ui.isToolModalOpen} onClose={() => onToolSelect(undefined)} title={t('navigation.addTool')}>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <Div style={{ display: 'flex', flexDirection: 'row', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', }}>
            {Object.keys(ALL_AVAILABLE_MODULES).map(key => (
              <Button key={key} onClick={() => onToolSelect(key)}>
                {t(`analysisTools.${key.toLowerCase()}`, key)}
              </Button>
            ))}
            <Button onClick={() => { onToolSelect(undefined); pluginInputRef.current?.click(); }}>{t('navigation.loadModule')}</Button>
          </Div>
        </Div>
      </Modal>

      <Modal isOpen={ui.isSettingsModalOpen} onClose={() => ui.setSettingsModalOpen(false)} title={t('settings.title')}>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>
          <Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>{t('settings.themeMode')}</span>
            <Button onClick={ui.toggleTheme} style={{ minWidth: '120px' }}>
              {ui.themeMode === 'light' ? t('settings.darkMode') : t('settings.lightMode')}
            </Button>
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
    </>
  );
};

export default AppModals;
