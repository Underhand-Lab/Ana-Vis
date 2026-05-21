import React, { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import { Div, Button, Select } from '@shared/bridges/UIBridge';
import VideoProcessorModal from '@packages/cv-val/component/VideoProcessorModal';
import TrackingEditorModal from '@apps/common/components/tracking-editor-modal';
import { ALL_DETECTORS, ALL_AVAILABLE_MODULES } from '../../../FeatureRegistry';
import { AppLogic } from '../hooks/useAppLogic';

interface AppModalsProps {
  logic: AppLogic;
  ui: {
    isProcessModalOpen: boolean; setProcessModalOpen: (v: boolean) => void;
    isToolModalOpen: boolean; setToolModalOpen: (v: boolean) => void;
    isEditorModalOpen: boolean; setEditorModalOpen: (v: boolean) => void;
    isSettingsModalOpen: boolean; setSettingsModalOpen: (v: boolean) => void;
    isEditSelectModalOpen: boolean; setEditSelectModalOpen: (v: boolean) => void;
    themeMode: string; toggleTheme: () => void;
  };
  pluginInputRef: React.RefObject<HTMLInputElement | null>;
}

const AppModals: React.FC<AppModalsProps> = ({ logic, ui, pluginInputRef }) => {
  const { t, i18n } = useTranslation();
  const maxFrame = logic.processedData ? (logic.processedData.getFrameCnt() - 1) : 0;

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

      {logic.editingType && (
        <TrackingEditorModal
          isOpen={ui.isEditorModalOpen} onClose={() => ui.setEditorModalOpen(false)} 
          initialFrame={logic.currentIdx} maxFrame={maxFrame} 
          confValue={logic.confValue} onConfChange={(e) => logic.handleConfChange(logic.editingType!, e)} 
          data={logic.processedData} type={logic.editingType!}
          getTrailLayer={logic.editingType === 'ball' ? logic.ballFrame.getTrailLayer : logic.batFrame.getTrailLayer} 
          getEditLayer={logic.editingType === 'ball' ? logic.ballFrame.getEditLayer : logic.batFrame.getEditLayer} 
          onCandidateSelect={(f, c) => logic.handleEditorCandidateSelect(logic.editingType!, f, c)}
        />
      )}

      <Modal isOpen={ui.isEditSelectModalOpen} onClose={() => ui.setEditSelectModalOpen(false)} title={t('navigation.selectEditTarget')}>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <Div style={{ display: 'flex', flexDirection: 'row', gap: '10px', justifyContent: 'center' }}>
            <Button onClick={() => { logic.setEditingType('ball'); ui.setEditorModalOpen(true); ui.setEditSelectModalOpen(false); }}>{t('navigation.editBall')}</Button>
            <Button onClick={() => { logic.setEditingType('bat'); ui.setEditorModalOpen(true); ui.setEditSelectModalOpen(false); }}>{t('navigation.editBat')}</Button>
          </Div>
        </Div>
      </Modal>

      <Modal isOpen={ui.isToolModalOpen} onClose={() => ui.setToolModalOpen(false)} title={t('navigation.addTool')}>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <Div style={{ display: 'flex', flexDirection: 'row', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', padding: '15px' }}>
            {Object.keys(ALL_AVAILABLE_MODULES).map(key => (
              <Button key={key} onClick={() => { logic.handleAddModule(key); ui.setToolModalOpen(false); }}>
                {t(`analysisTools.${key.toLowerCase()}`, key)}
              </Button>
            ))}
            <Button onClick={() => { ui.setToolModalOpen(false); pluginInputRef.current?.click(); }}>{t('navigation.loadModule')}</Button>
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