import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { AnalysisBox } from "../lib/cv-val/common/analysis-box.js";

const AnalysisContainer = forwardRef(({ data, toolConfigs, defaultTools, onUpdate }, ref) => {
  const wrapperRef = useRef(null);
  const boxInstance = useRef(new AnalysisBox());
  
  // 1. 클로저 문제 해결을 위해 최신 콜백을 담을 Ref 생성
  const onUpdateRef = useRef(onUpdate);

  // onUpdate가 바뀔 때마다 Ref를 갱신 (리렌더링 유발 X)
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useImperativeHandle(ref, () => ({
    addTool: async (type) => {
      if (boxInstance.current) await boxInstance.current.addFrame(type);
    },
    registerPlugin: async (file) => {
      await boxInstance.current.registerPlugin(file);
    },
    getCurrentIdx: () => boxInstance.current.nowIdx(),
    updateImage: () => boxInstance.current.updateImage(),
    bindEvents: (target, callbacks) => {
      boxInstance.current.bindUI(target, callbacks);
    }
  }));

  // 초기화 및 이벤트 바인딩
  useEffect(() => {
    const initAnalysis = async () => {
      if (!wrapperRef.current) return;
      const instance = boxInstance.current;

      // 2. 바인딩 시 직접 onUpdate를 주지 않고, 항상 Ref의 현재값을 호출하는 익명 함수 전달
      instance.bindUI(wrapperRef.current.ownerDocument, {
        onUpdate: (frameIdx) => {
          if (onUpdateRef.current) onUpdateRef.current(frameIdx);
        }
      });

      if (toolConfigs) {
        for (const [type, config] of Object.entries(toolConfigs)) {
          await instance.registerFrameMaker(type, config);
        }
      }

      if (defaultTools) {
        await instance.initDefault(defaultTools);
      }
    };

    initAnalysis();
    
    // Cleanup: 컴포넌트 언마운트 시 인스턴스 정리 로직이 필요하다면 여기에 추가
  }, []); // 의존성을 비워 초기 1회만 실행 (config가 동적으로 변하지 않는다는 가정)

  // 3. 데이터 업데이트 감지
  useEffect(() => {
    // data가 null이라도 인스턴스에는 알려줘야 함
    if (boxInstance.current) {
      boxInstance.current.setData(data);
      // 데이터가 새로 들어왔을 때 화면 갱신이 필요하면 추가
      boxInstance.current.updateImage(); 
    }
  }, [data]);

  return (
    <div 
      id="boxes" 
      ref={wrapperRef} 
      className="analysis-container-layer"
      style={{ width: '100%', minHeight: '500px' }}
    />
  );
});

export default AnalysisContainer;