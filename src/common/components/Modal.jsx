import React from 'react';
import ReactDOM from 'react-dom';

const Modal = ({ isOpen, onClose, title, children }) => {
  // 팝업이 닫혀있으면 아무것도 렌더링하지 않음
  if (!isOpen) return null;

  // 이식성을 위해 body 바로 아래에 렌더링 (Portal 사용)
  return ReactDOM.createPortal(
    <div className="panel frostedglassmorphism" style={overlayStyle} onClick={onClose}>
      <div 
        className="pop-up container neumorphism" 
        style={modalStyle} 
        onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h1>{title}</h1>
        </div>
        <hr />
        {children}
        <hr />
        <button onClick={onClose}>닫기</button>
      </div>
    </div>,
    document.body
  );
};

// 인라인 스타일 (CSS 파일로 옮기셔도 됩니다)
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, height: '100%',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};

const modalStyle = {
  minWidth: '300px', maxWidth: '500px', padding: '10px 25px'
};

export default Modal;