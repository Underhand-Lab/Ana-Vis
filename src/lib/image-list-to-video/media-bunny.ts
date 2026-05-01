import {
    Output, Mp4OutputFormat, BufferTarget,
    VideoSampleSource, VideoSample
}
from "mediabunny";

export interface IImageListToVideo {
    init(): Promise<void>;
    addImage(idx: number, imgBlob: Blob): Promise<void>;
    export(fps: number): Promise<Blob>;
    postprocess(): void;
}

export class MediabunnyImageListToVideo implements IImageListToVideo {
    private width: number = 0;
    private height: number = 0;
    private frames: Blob[] = []; // 이미지 Blob들을 담는 배열

    async init(): Promise<void> {
        return;
    }

    async addImage(idx: number, imgBlob: Blob): Promise<void> {
        if (this.width === 0) {
            const bitmap = await createImageBitmap(imgBlob);
            // H.264 코덱 호환성을 위해 2의 배수로 해상도 보정
            this.width = Math.ceil(bitmap.width / 2) * 2;
            this.height = Math.ceil(bitmap.height / 2) * 2;
            bitmap.close();
        }
        this.frames.push(imgBlob);
    }

    async export(fps: number): Promise<Blob> {
        const output = new (Output as any)({
            format: new (Mp4OutputFormat as any)(),
            target: new (BufferTarget as any)(),
        });

        const canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Canvas context를 생성할 수 없습니다.");
        }

        // ✅ 비디오 트랙은 단 1개
        const videoSource = new (VideoSampleSource as any)({
            codec: "avc",
            bitrate: 1_000_000,
        });

        output.addVideoTrack(videoSource, {
            frameRate: fps,
        });

        await output.start();

        const duration = 1 / fps;

        for (let i = 0; i < this.frames.length; i++) {
            const imgBlob = this.frames[i];
            const bitmap = await createImageBitmap(imgBlob);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

            bitmap.close();

            const sample = new (VideoSample as any)(canvas, {    
                timestamp: duration * i,
                duration: 1 / fps
            });

            await (videoSource as any).add(sample);
            sample.close();
        }

        await output.finalize();

        return new Blob([output.target.buffer], {
            type: "video/mp4",
        });
    }

    /**
     * 작업 완료 후 내부 리소스 정리
     */
    postprocess(): void {
        this.frames = [];
        this.width = 0;
        this.height = 0;
    }

}