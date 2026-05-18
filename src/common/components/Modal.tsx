import React, { ReactNode, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Div, Box, Button } from '../bridges/UIBridge';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // 팝업이 닫혀있으면 아무것도 렌더링하지 않음
  if (!isOpen) return null;
  const rootBody = document.body;
  if (!rootBody) return null;

  // 이식성을 위해 body 바로 아래에 렌더링 (Portal 사용)
  return createPortal(
    <Div className="panel frostedglassmorphism" style={overlayStyle} onClick={onClose}>
      <Box
        className="pop-up container" 
        style={modalStyle} 
        onClick={(e: MouseEvent) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
      >
        <Div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h1>{title}</h1>
        </Div>
        <Div style= {{maxHeight: '60vh'}}>
          {children}
        </Div>
        <Button onClick={onClose}>닫기</Button>
      </Box>
    </Div>,
    rootBody
  );
};

// 인라인 스타일 (CSS 파일로 옮기셔도 됩니다)
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, height: '100%',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
};

const modalStyle: React.CSSProperties = {
  minWidth: '300px', maxWidth: '500px', padding: '10px 25px', 
};

export default Modal;