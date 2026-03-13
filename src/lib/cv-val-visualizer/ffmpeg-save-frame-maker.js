const { createFFmpeg } = FFmpeg;

export class SaveFrameMaker {
    constructor(frameMaker) {
        this.frameMaker = frameMaker;
        this.ffmpeg = null; // 고정 인스턴스를 유지하지 않음
    }

    // 매번 인스턴스를 새로 생성하는 헬퍼 메서드
    async initFFmpeg() {
        this.ffmpeg = createFFmpeg({
            mainName: 'main',
            corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js'
        });
        await this.ffmpeg.load();
    }

    async export(trackData) {
        const frameCount = trackData.getFrameCnt();
        if (frameCount === 0) return;

        // 1. 매 실행마다 인스턴스 새로 생성 및 로드 (메모리 및 프로세스 초기화)
        await this.initFFmpeg();

        const metadata = trackData.getVideoMetadata(0);
        const fps = metadata.fps || 24;

        try {
            // 2. 프레임 이미지 파일 작성
            for (let i = 0; i < frameCount; i++) {
                const canvas = this.frameMaker.getImageAt(i);
                // JPEG 퀄리티 조절 (RAM 최적화)
                const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
                const arrayBuffer = await blob.arrayBuffer();
                const fileName = `frame${String(i).padStart(5, '0')}.jpg`;

                this.ffmpeg.FS('writeFile', fileName, new Uint8Array(arrayBuffer));
            }

            // 3. 인코딩 실행
            // 싱글 스레드 버전은 인코딩이 끝나면 자동으로 exit(0) 신호를 보냅니다.
            await this.ffmpeg.run(
                '-framerate', String(fps),
                '-i', 'frame%05d.jpg',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                'output.mp4'
            );

            // 4. 결과물 읽기 및 저장
            const outputData = this.ffmpeg.FS('readFile', 'output.mp4');
            this._download(new Blob([outputData.buffer], { type: 'video/mp4' }), `analysis_${Date.now()}.mp4`);

        } catch (error) {
            console.error("FFmpeg 작업 중 오류 발생:", error);
            // 오류 발생 시에도 다음 저장을 위해 인스턴스 파기 준비
        } finally {
            // 5. 메모리 정리 (FS 내 파일 삭제)
            // 인스턴스를 파기하더라도 명시적으로 파일을 지우는 것이 브라우저 힙 메모리에 좋습니다.
            try {
                const files = this.ffmpeg.FS('readdir', '/');
                files.forEach(file => {
                    if (file.startsWith('frame') || file === 'output.mp4') {
                        this.ffmpeg.FS('unlink', file);
                    }
                });
            } catch (e) {}

            // 6. 인스턴스 참조 해제 (Garbage Collection 유도)
            this.ffmpeg = null;
            console.log("FFmpeg 인스턴스 파기 및 메모리 정리 완료.");
        }
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