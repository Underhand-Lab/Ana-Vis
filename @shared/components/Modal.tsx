import React, { ReactNode, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Div, Box, Button, H1 } from '../bridges/UIBridge';
import vars from './ui-brick/variables';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, style }) => {
  const { t } = useTranslation();
  // 팝업이 닫혀있으면 아무것도 렌더링하지 않음
  if (!isOpen) return null;
  const rootBody = document.body;
  if (!rootBody) return null;

  // 이식성을 위해 body 바로 아래에 렌더링 (Portal 사용)
  return createPortal(
    <Div
      className="panel frostedglassmorphism"
      style={{...overlayStyle, fontFamily: vars.font}}
      onClick={onClose}>
      <Box
        className="pop-up container" 
        style={{...modalStyle, color: vars.text, ...style}} 
        onClick={(e: MouseEvent) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
      >
        <Div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <H1>{title}</H1>
        </Div>
        <Div style= {{ paddingBottom: '15px' }}>
          {children}
        </Div>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </Box>
    </Div>,
    rootBody
  );
};

// 인라인 스타일 (CSS 파일로 옮기셔도 됩니다)
const overlayStyle: React.CSSProperties = {
  position: 'fixed', 
  top: 0, left: 0, right: 0, bottom: 0, // height: '100%' 대신 bottom: 0을 사용하여 키보드 대응
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center', 
  zIndex: 100
};

const modalStyle: React.CSSProperties = {
  maxWidth: '500px', padding: '10px 25px', 
};

export default Modal;