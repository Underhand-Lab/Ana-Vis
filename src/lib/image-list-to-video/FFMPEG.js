const { createFFmpeg } = FFmpeg;

export class FFMPEGImageListToVideo {
    constructor() {
        this.ffmpeg = null; // 고정 인스턴스를 유지하지 않음
    }

    // 매번 인스턴스를 새로 생성하는 헬퍼 메서드
    async init() {
        this.ffmpeg = createFFmpeg({
            mainName: 'main',
            corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js'
        });
        await this.ffmpeg.load();
    }

    async addImage(idx, imgBlob) {
        const arrayBuffer = await imgBlob.arrayBuffer();
        const fileName = `frame${String(idx).padStart(5, '0')}.jpg`;
        this.ffmpeg.FS('writeFile', fileName,
            new Uint8Array(arrayBuffer))
    }
async export(fps) {
    try {
        
        await this.ffmpeg.run(
            '-framerate', String(fps),
            '-i', 'frame%05d.jpg',
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
            'output.mp4'
        );

        // 2. 파일이 존재하는지 먼저 확인
        const files = this.ffmpeg.FS('readdir', '/');
        if (!files.includes('output.mp4')) {
            throw new Error("FFmpeg 실행은 끝났으나 output.mp4가 생성되지 않았습니다. 코덱이나 입력 파일을 확인하세요.");
        }

        const outputData = this.ffmpeg.FS('readFile', 'output.mp4');
        return new Blob([outputData.buffer], { type: 'video/mp4' });

    } catch (error) {
        console.error("Export 과정에서 에러 발생:", error);
        throw error;
    }
}

    postprocess() {

        try {
            const files = this.ffmpeg.FS('readdir', '/');
            files.forEach(file => {
                if (file.startsWith('frame') || file === 'output.mp4') {
                    this.ffmpeg.FS('unlink', file);
                }
            });
        } catch (e) { }

        // 6. 인스턴스 참조 해제 (Garbage Collection 유도)
        this.ffmpeg = null;
        console.log("FFmpeg 인스턴스 파기 및 메모리 정리 완료.");

    }

    async exportImageListToVideo(imageList) {
        
    }
}