export class SaveFrameMaker {
    constructor(frameMaker) {
        this.frameMaker = frameMaker;
    }

    async export(trackData) {
        const frameCount = trackData.getFrameCnt();
        if (frameCount === 0) return;

        const metadata = trackData.getVideoMetadata(0);
        const fps = metadata.fps || 24;
        const frameDuration = 1000 / fps; 

        // 인스턴스가 바뀌어도 현재 프레임메이커가 사용하는 캔버스를 직접 참조
        const canvas = this.frameMaker.renderer.canvas;
        this.frameMaker.drawImageAt(0);
        
        // 중요: 캔버스가 화면에 보이지 않아도 브라우저가 그리기를 포기하지 않도록 함
        const stream = canvas.captureStream(fps);
        const mimeType = 'video/mp4';
        
        const recordedChunks = [];
        const recorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: 10000000 
        });

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };

        return new Promise(async (resolve) => {
            recorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: mimeType });
                this._download(blob, `bat_tracking_${Date.now()}.mp4`);
                resolve();
            };

            recorder.start();

            for (let i = 0; i < frameCount; i++) {
                // 1. 현재 프레임 그리기
                // (이때 TrackFrameMaker 내부에서 trackData.getSelectedBallAt(i)를 쓰는지 확인 필요)
                this.frameMaker.drawImageAt(i);

                // 2. 브라우저가 캔버스에 실제로 픽셀을 기록할 시간을 줌
                await new Promise(r => requestAnimationFrame(r));
                
                // 3. MediaRecorder가 스트림을 캡처할 물리적 시간 확보
                await new Promise(r => setTimeout(r, frameDuration));
            }

            // 마무리를 위해 약간의 여유를 두고 정지
            setTimeout(() => recorder.stop(), 500);
        });
    }

    _download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}