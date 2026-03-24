import { useState } from 'react';
import { Processor } from '../../lib/cv-val/processor.js';
import { PoseData } from '../../lib/cv-val/pose/pose-data.js';

export const useProcessor = (detector) => {
  const [status, setStatus] = useState('before-process');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const processVideo = async (files) => {
    if (!files.length || !detector) return;
    
    setIsProcessing(true);
    const processor = new Processor();

    try {
      processor.setting(detector, {
        onState: (state) => setStatus(state),
        onProgress: (current, total) => setProgress({ current, total })
      });

      const result = await processor.processVideo(files, new PoseData());
      setStatus('after-process');
      return result;
    } catch (error) {
      alert("처리 중 오류 발생");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return { status, progress, isProcessing, processVideo };
};