import React, { ChangeEvent, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import { Div, Button, Select, vars } from '@shared/bridges/UIBridge';
import VideoProcessorModal from '@packages/cv-val/component/VideoProcessorModal';
import { ALL_DETECTORS, ALL_AVAILABLE_MODULES } from '../../../FeatureRegistry';
import { AppLogic } from '../hooks/useAppLogic';
import { getSystemTheme, setThemeMode } from '@shared/components/ui-brick/variables';

interface AppModalsProps {
  logic: AppLogic;
  ui: {
    isProcessModalOpen: boolean; setProcessModalOpen: (v: boolean) => void;
    isToolModalOpen: boolean; setToolModalOpen: (v: boolean) => void;
    isSettingsModalOpen: boolean; setSettingsModalOpen: (v: boolean) => void;
    themeMode: 'light' | 'dark'; toggleTheme: () => void;
    font: string; setFont: (f: string) => void;
  };
  pluginInputRef: React.RefObject<HTMLInputElement | null>;
  onToolSelect: (selectedKey: string | undefined) => void;
}

const AppModals: React.FC<AppModalsProps> = ({ logic, ui, pluginInputRef, onToolSelect }) => {
  const { t, i18n } = useTranslation();
  const [fontLoadingStatus, setFontLoadingStatus] = useState<'loading' | 'success' | 'error' | 'not-supported'>('loading');
  const [fontOptions, setFontOptions] = useState([
    { label: 'Default', value: 'KBO-Dia-Gothic_medium'},
    { label: 'System UI', value: 'system-ui, -apple-system, sans-serif' },
    { label: 'Serif', value: 'serif' },
    { label: 'Sans-Serif', value: 'sans-serif' },
    { label: 'Monospace', value: 'monospace' },
  ]);

  useEffect(() => {
    const loadSystemFonts = async () => {
      // 브라우저의 Local Font Access API 지원 여부 확인
      if ('queryLocalFonts' in window) {
        try {
          // 사용자에게 폰트 접근 권한 요청 및 목록 가져오기
          const availableFonts = await (window as any).queryLocalFonts();
          // 중복된 폰트 패밀리 제거 및 정렬
          const families = Array.from(new Set(availableFonts.map((f: any) => f.family))) as string[];
          const localOptions = families.sort().map(family => ({
            label: family,
            value: family
          }));
          
          if (localOptions.length > 0) {
            setFontOptions(prev => [...prev, ...localOptions]);
          }
          setFontLoadingStatus('success');
        } catch (err) {
          console.warn('시스템 폰트 목록을 불러올 수 없습니다:', err);
          setFontLoadingStatus('error');
        }
      } else {
        setFontLoadingStatus('not-supported');
      }
    };
    loadSystemFonts();
  }, []);

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
          <Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold' }}>{t('settings.font', '글꼴')}</label>
            <Select
              value={ui.font}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => ui.setFont(e.target.value)}
              options={fontOptions}
              style={{ minWidth: '120px' }}
            />
          </Div>
          {fontLoadingStatus === 'loading' && (
            <Div style={{ fontSize: '12px', color: '#666', textAlign: 'right', marginTop: '-15px' }}>
              {t('settings.loadingFonts', '시스템 글꼴 로드 중...')}
            </Div>
          )}
          {fontLoadingStatus === 'not-supported' && (
            <Div style={{ fontSize: '11px', color: '#999', textAlign: 'right', marginTop: '-15px' }}>
              {t('settings.fontNotSupported', '이 브라우저는 시스템 글꼴 접근을 지원하지 않습니다.')}
            </Div>
          )}
        </Div>
      </Modal>
    </>
  );
};

export default AppModals;
