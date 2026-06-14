import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import { Div, Button } from '@shared/bridges/UIBridge';
import SearchableSelect from '@shared/components/SearchableSelect';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
  font: string;
  setFont: (f: string) => void;
}

const RECENT_FONTS_KEY = 'cvval_recent_fonts';

const AppSettingsModal: React.FC<AppSettingsModalProps> = ({ isOpen, onClose, themeMode, toggleTheme, font, setFont }) => {
  const { t, i18n } = useTranslation();
  const [recentFonts, setRecentFonts] = useState<any[]>([]);
  const [fontLoadingStatus, setFontLoadingStatus] = useState<'loading' | 'success' | 'error' | 'not-supported'>('loading');
  const [fontOptions, setFontOptions] = useState<any[][]>([
    [
      { label: 'Default', value: 'KBO-Dia-Gothic_medium'},
      { label: 'System UI', value: 'system-ui, -apple-system, sans-serif' },
      { label: 'Serif', value: 'serif' },
      { label: 'Sans-Serif', value: 'sans-serif' },
      { label: 'Monospace', value: 'monospace' },
    ],
    []
  ]);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_FONTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentFonts(parsed.map((f: any) => typeof f === 'string' ? { label: f, value: f } : f).slice(0, 3));
      } catch (e) {}
    }

    const loadSystemFonts = async () => {
      if ('queryLocalFonts' in window) {
        try {
          const availableFonts = await (window as any).queryLocalFonts();
          const families = Array.from(new Set(availableFonts.map((f: any) => f.family))) as string[];
          setFontOptions(prev => [prev[0], families.sort().map(f => ({ label: f, value: f }))]);
          setFontLoadingStatus('success');
        } catch (err) { setFontLoadingStatus('error'); }
      } else { setFontLoadingStatus('not-supported'); }
    };
    loadSystemFonts();
  }, []);

  const handleFontChange = (val: string) => {
    setFont(val);
    const opt = fontOptions.flat().find(o => o.value === val) || { label: val, value: val };
    setRecentFonts(prev => {
      const next = [opt, ...prev.filter(i => i.value !== val)].slice(0, 3);
      localStorage.setItem(RECENT_FONTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')}>
      <Div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>
        <Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>{t('settings.themeMode')}</span>
          <Button onClick={toggleTheme} style={{ minWidth: '120px' }}>
            {themeMode === 'light' ? t('settings.darkMode') : t('settings.lightMode')}
          </Button>
        </Div>
        <Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>{t('settings.language')}</span>
          <SearchableSelect
            value={i18n.language}
            sections={[{ options: [{ label: '한국어', value: 'ko' }, { label: 'English', value: 'en' }] }]}
            onChange={(val) => i18n.changeLanguage(val)}
            placeholder={t('settings.languagePlaceholder', '언어 검색...')}
            style={{ width: '180px' }}
          />
        </Div>
        <Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>{t('settings.font', '글꼴')}</span>
          <SearchableSelect
            value={font}
            sections={[
              ...(recentFonts.length > 0 ? [{ label: t('settings.recentFonts', '최근 사용'), options: recentFonts }] : []),
              { label: t('settings.defaultFonts', '기본 글꼴'), options: fontOptions[0] },
              { label: t('settings.systemFonts', '시스템 글꼴'), options: fontOptions[1] }
            ]}
            onChange={handleFontChange}
            placeholder={t('settings.fontPlaceholder', '글꼴 입력 또는 검색...')}
            renderOption={(opt, isSelected) => (
              <span style={{ fontFamily: opt.value, fontWeight: isSelected ? 'bold' : 'normal' }}>
                {opt.label}
              </span>
            )}
            style={{ width: '180px' }}
            inputStyle={{ fontFamily: font }}
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
  );
};

export default AppSettingsModal;