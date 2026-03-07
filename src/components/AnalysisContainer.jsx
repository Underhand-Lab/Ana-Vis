// AnalysisContainer.jsx
import React, { useEffect, useRef } from 'react';
import { AnalysisBox } from "../lib/cv-val/common/analysis-box.js";

const AnalysisContainer = ({ data, onInstanceReady }) => {
  const wrapperRef = useRef(null);
  const boxInstance = useRef(new AnalysisBox());

  useEffect(() => {
    const container = wrapperRef.current;
    if (container) {
      // ❌ 기존: boxInstance.current.bindUI(document); 
      // ✅ 수정: 현재 컴포넌트의 root element를 넘겨 범위 제한
      boxInstance.current.bindUI(container.ownerDocument);
      
      if (onInstanceReady) {
        onInstanceReady(boxInstance.current);
      }
    }
  }, []);

  useEffect(() => {
    if (data && boxInstance.current) {
      boxInstance.current.setData(data);
    }
  }, [data]);

  return (
    <div id="boxes" ref={wrapperRef}></div>
  );
};

export default AnalysisContainer;