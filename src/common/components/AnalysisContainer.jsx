import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { AnalysisBox } from "../lib/cv-val/common/analysis-box.js";

const AnalysisContainer = forwardRef(({ data, toolConfigs, defaultTools, onUpdate, currentIdx = 0 }, ref) => {
  const wrapperRef = useRef(null);
  const boxInstance = useRef(new AnalysisBox());
  const onUpdateRef = useRef(onUpdate);
  const isInitialized = useRef(false); // 초기화 완료 여부 플래그

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // 1. currentIdx 변경 시 자동 이미지 업데이트
  useEffect(() => {
    // 초기화가 완료된 시점부터만 인스턴스 메서드를 호출합니다.
    if (isInitialized.current && boxInstance.current) {
      // drawImageAt이 내부 인덱스 동기화까지 담당한다면 이것만 호출하면 됩니다.
      boxInstance.current.updateImage(currentIdx)
    }
  }, [currentIdx]);

  useImperativeHandle(ref, () => ({
    addTool: async (type) => {
      if (boxInstance.current) await boxInstance.current.addFrame(type);
    },
    registerPlugin: async (file) => {
      await boxInstance.current.registerPlugin(file);
    },
    getCurrentIdx: () => boxInstance.current.nowIdx(),
    updateImage: () => boxInstance.current.updateImage(currentIdx),
    drawImageAt: (idx) => {
      boxInstance.current.drawImageAt?.(idx);
    }
  }));

  // 초기화 및 이벤트 바인딩
  useEffect(() => {
    const initAnalysis = async () => {
      if (!wrapperRef.current) return;
      const instance = boxInstance.current;

      instance.bindUI(wrapperRef.current, {
        onUpdate: (frameIdx) => {
          // 내부에서 드래그 등으로 인덱스 변경 시 부모 상태로 역전파
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

      // 2. 초기화 완료 후 첫 화면 그리기
      isInitialized.current = true;
      instance.setData(data);
      instance.drawImageAt?.(currentIdx);
    };

    initAnalysis();
  }, []); // 마운트 시 1회

  // 3. 데이터 업데이트 감지
  useEffect(() => {
    if (isInitialized.current && boxInstance.current) {
      boxInstance.current.setData(data);
      boxInstance.current.updateImage?.(currentIdx); 
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