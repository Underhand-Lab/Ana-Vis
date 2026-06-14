import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import { Div, Button, vars, InputText } from '@shared/bridges/UIBridge';
import ToolAddModalItem from './ToolAddModalItem';
import { ALL_AVAILABLE_MODULES } from '../../../FeatureRegistry';

interface ToolAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToolSelect: (selectedKey: string | undefined) => void;
  pluginInputRef: React.RefObject<HTMLInputElement | null>;
}

const RECENT_TOOLS_KEY = 'cvval_recent_tools';
const LOCAL_PLUGINS_KEY = 'cvval_local_plugins';

const ToolAddModal: React.FC<ToolAddModalProps> = ({ isOpen, onClose, onToolSelect, pluginInputRef }) => {
  const { t } = useTranslation();
  const [recentTools, setRecentTools] = useState<string[]>([]);
  const [localPlugins, setLocalPlugins] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPlugins = () => {
    const savedPlugins = localStorage.getItem(LOCAL_PLUGINS_KEY);
    if (savedPlugins) try { setLocalPlugins(JSON.parse(savedPlugins)); } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      const savedRecent = localStorage.getItem(RECENT_TOOLS_KEY);
      if (savedRecent) try { setRecentTools(JSON.parse(savedRecent)); } catch (e) {}
      
      loadPlugins();

      setSearchQuery('');
      
      window.addEventListener('cvval_plugins_updated', loadPlugins);
      return () => window.removeEventListener('cvval_plugins_updated', loadPlugins);
    }
  }, [isOpen]);

  const handleToolSelectInternal = (key: string) => {
    const nextRecent = [key, ...recentTools.filter(k => k !== key)].slice(0, 10);
    setRecentTools(nextRecent);
    localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(nextRecent));
    onToolSelect(key);
  };

  // 표시할 아이템 계산 (검색어 여부에 따라 결정)
  const isSearching = searchQuery.trim() !== '';
  
  const displayItems = isSearching 
    ? [...Object.keys(ALL_AVAILABLE_MODULES).map(k => ({ id: k, label: t(`analysisTools.${k.toLowerCase()}`, k), type: t('common.system', '시스템') })),
       ...localPlugins.map(p => ({ id: p.id, label: p.title, type: t('common.plugin', '플러그인') }))]
       .filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : Array.from(new Set([...recentTools, ...Object.keys(ALL_AVAILABLE_MODULES)])).slice(0, 6).map(key => {
      const plugin = localPlugins.find(p => p.id === key);
      return {
        id: key,
        label: plugin?.title || t(`analysisTools.${key.toLowerCase()}`, key),
        type: plugin ? t('common.plugin', '플러그인') : t('common.system', '시스템'),
      };
    });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('navigation.addTool')} style={{ maxWidth: '200px'}}>
      <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <InputText
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('navigation.searchTool', '도구 검색...')}
            style={{ flex: 1 }}
          />
          <Button
            onClick={() => pluginInputRef.current?.click()}
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              fontSize: '20px',
              flexShrink: 0
            }}
          >
            +
          </Button>
        </Div>

        <Div style={{ 
          display: 'flex',
          flexDirection: 'column', // 수직 리스트로 변경
          gap: '0px', // 아이템 사이 간격 제거 (구분선 위주)
          minHeight: '220px',
          maxHeight: '220px',
          overflowY: 'auto',
          justifyContent: isSearching && displayItems.length === 0 ? 'center' : 'flex-start',
          alignItems: 'stretch'
        }}>
          {displayItems.map(opt => (
            <ToolAddModalItem
              key={opt.id}
              {...opt}
              isSystem={opt.type === t('common.system', '시스템')}
              onClick={() => handleToolSelectInternal(opt.id)}
            />
          ))}
          
          {isSearching && displayItems.length === 0 && (
            <Div style={{ textAlign: 'center', padding: '20px 10px', fontSize: '13px' }}>
              {t('common.noResults', '검색 결과가 없습니다.')}
            </Div>
          )}
        </Div>
      </Div>
    </Modal>
  );
};

export default ToolAddModal;