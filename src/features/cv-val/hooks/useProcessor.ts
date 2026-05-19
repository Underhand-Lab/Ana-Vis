import { useState, useCallback, useMemo } from 'react';

import type { IDetector } from '../types/detector.js';
import { CVValData } from '../core/cvval-data.js';
import { Processor } from '../core/processor.js';

export function useProcessor() {
    const [status, setStatus] = useState<string>("before-process");
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    const processor = useMemo(() => new Processor(), []);

    const processVideo = useCallback(async (
        detector: IDetector,
        videoList: FileList | Blob[],
        type: string,
        cvval: CVValData,
        data: any
    ) => {
        setIsProcessing(true);
        try {
            processor.setting(detector, {
                onState: (state) => setStatus(state),
                onProgress: (current, total) => setProgress({ current, total })
            });

            const result = await processor.processVideo(videoList, type, cvval, data);
            setStatus("completed");
            return result;
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

    return { status, progress, isProcessing, processVideo, reset };
}