const { createFFmpeg } = FFmpeg;

export class FFMPEGImageListToVideo {
    constructor() {
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

    async addImage(imgBlob) {
        const blob = await new Promise(
            res => img.toBlob(res, 'image/jpeg', 0.9));
        const arrayBuffer = await imgBlob.arrayBuffer();
        const fileName = `frame${String(i).padStart(5, '0')}.jpg`;
        this.ffmpeg.FS('writeFile', fileName,
            new Uint8Array(arrayBuffer))
    }

    async export(fps) {

        await this.ffmpeg.run(
            '-framerate', String(fps),
            '-i', 'frame%05d.jpg',
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            'output.mp4'
        );

        const outputData = this.ffmpeg.FS('readFile', 'output.mp4');

        return new Blob([outputData.buffer], { type: 'video/mp4' });

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