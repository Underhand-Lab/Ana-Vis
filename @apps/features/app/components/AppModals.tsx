import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import { Div, Button, vars } from '@shared/bridges/UIBridge';
import VideoProcessorModal from '@packages/cv-val/component/VideoProcessorModal';
import { ALL_DETECTORS, ALL_AVAILABLE_MODULES } from '../../../FeatureRegistry';
import { AppLogic } from '../hooks/useAppLogic';
import SearchableSelect from '@shared/components/SearchableSelect';

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
  const RECENT_FONTS_KEY = 'cvval_recent_fonts';
  const [recentFonts, setRecentFonts] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_FONTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // 구 버전 데이터(string[])를 신규 버전({label, value}[])으로 변환하고 3개로 제한
          const normalized = parsed.map(f => typeof f === 'string' ? { label: f, value: f } : f).slice(0, 3);
          setRecentFonts(normalized);
        }
      } catch (e) {}
    }
  }, []);

  const [fontLoadingStatus, setFontLoadingStatus] = useState<'loading' | 'success' | 'error' | 'not-supported'>('loading');
  const [fontOptions, setFontOptions] = useState<any[][]>([
    [
      { label: 'Default', value: 'KBO-Dia-Gothic_medium'},
      { label: 'System UI', value: 'system-ui, -apple-system, sans-serif' },
      { label: 'Serif', value: 'serif' },
      { label: 'Sans-Serif', value: 'sans-serif' },
      { label: 'Monospace', value: 'monospace' },
    ],
    [] // 시스템 폰트가 들어갈 두 번째 섹션
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
            setFontOptions(prev => [
              prev[0], // 기본 폰트 섹션 유지
              localOptions // 시스템 폰트 섹션 업데이트
            ]);
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

  const handleFontChange = (val: string) => {
    ui.setFont(val);
    
    // 전체 목록에서 선택된 옵션 객체 찾기
    const allOptions = fontOptions.flat();
    const opt = allOptions.find(o => o.value === val) || { label: val, value: val };
    
    setRecentFonts(prev => {
      // 중복 제거 후 최신 선택을 맨 앞으로 보내고 최대 3개까지만 유지
      const next = [opt, ...prev.filter(i => (typeof i === 'object' ? i.value : i) !== val)].slice(0, 3);
      localStorage.setItem(RECENT_FONTS_KEY, JSON.stringify(next));
      return next;
    });
  };

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
            <SearchableSelect
              value={i18n.language}
              sections={[{
                options: [{ label: '한국어', value: 'ko' }, { label: 'English', value: 'en' }]
              }]}
              onChange={(val) => i18n.changeLanguage(val)}
              searchResultsLabel={t('settings.searchResults', '검색 결과')}
              placeholder={t('settings.languagePlaceholder', '언어 검색...')}
              style={{ width: '180px' }}
            />
          </Div>
          <Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>{t('settings.font', '글꼴')}</span>
            <SearchableSelect
              value={ui.font}
              sections={[
                ...(recentFonts.length > 0 ? [{ label: t('settings.recentFonts', '최근 사용'), options: recentFonts }] : []),
                { label: t('settings.defaultFonts', '기본 글꼴'), options: fontOptions[0] },
                { label: t('settings.systemFonts', '시스템 글꼴'), options: fontOptions[1] }
              ]}
              onChange={handleFontChange}
              searchResultsLabel={t('settings.searchResults', '검색 결과')}
              placeholder={t('settings.fontPlaceholder', '글꼴 입력 또는 검색...')}
              renderOption={(opt, isSelected) => (
                <span style={{ fontFamily: opt.value, fontWeight: isSelected ? 'bold' : 'normal' }}>
                  {opt.label}
                </span>
              )}
              style={{ width: '180px' }}
              inputStyle={{ fontFamily: ui.font }}
            />
          </Div>
          {fontLoadingStatus === 'loading' && (
            <Div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
              {t('settings.loadingFonts', '시스템 글꼴 로드 중...')}
            </Div>
          )}
          {fontLoadingStatus === 'not-supported' && (
            <Div style={{ fontSize: '11px', color: '#999', textAlign: 'right' }}>
              {t('settings.fontNotSupported', '이 브라우저는 시스템 글꼴 접근을 지원하지 않습니다.')}
            </Div>
          )}
        </Div>
      </Modal>
    </>
  );
};

export default AppModals;
