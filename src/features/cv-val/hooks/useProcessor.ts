import { useState, useCallback, useMemo } from 'react';

import type { IDetector } from '../types/detector.js';
import { CVValData } from '../core/cvval-data.js';
import { Processor } from '../core/processor.js';

export function useProcessor() {
    const [status, setStatus] = useState<string>("before-process");
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    const processor = useMemo(() => new Processor(), []);

    /**
     * 1단계: 비디오를 지정하여 CVValData에 이미지 리스트(프레임)를 추출 및 추가합니다.
     */
    const loadVideo = useCallback(async (
        videoList: FileList | Blob[],
        cvval: CVValData
    ): Promise<CVValData> => {
        setIsProcessing(true);
        try {
            processor.setting(null as any, {
                onState: (state) => setStatus(state),
                onProgress: (current, total) => setProgress({ current, total })
            });

            // 비디오 디코딩 및 프레임 추출 로직 수행
            await processor.loadVideo(videoList, cvval);
            setStatus("video-loaded");
            // React의 상태 변경 감지를 위해 객체 참조를 새로 생성하여 반환합니다.
            return Object.assign(Object.create(Object.getPrototypeOf(cvval)), cvval);
        } catch (error) {
            setStatus("error");
            throw error;
        } finally {
            setIsProcessing(false);
        }
    }, [processor]);

    /**
     * 2단계: 이미 로드된 CVValData의 이미지 리스트를 기반으로 디텍터를 실행합니다.
     */
    const runInference = useCallback(async (
        detector: IDetector,
        type: string,
        cvval: CVValData,
        data: any
    ): Promise<CVValData> => {
        setIsProcessing(true);
        try {
            processor.setting(detector, {
                onState: (state) => setStatus(state),
                onProgress: (current, total) => setProgress({ current, total })
            });

            await processor.runInference(type, cvval, data);
            setStatus("completed");
            // React의 상태 변경 감지를 위해 객체 참조를 새로 생성하여 반환합니다.
            return Object.assign(Object.create(Object.getPrototypeOf(cvval)), cvval);
        } catch (error) {
            setStatus("error");
            throw error;
        } finally {
            setIsProcessing(false);
        }
    }, [processor]);

    const reset = useCallback(() => {
        setStatus("before-process");
        setProgress({ current: 0, total: 0 });
        setIsProcessing(false);
    }, []);

    return { status, progress, isProcessing, loadVideo, runInference, reset };
}