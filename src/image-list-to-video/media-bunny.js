import { Output, Mp4OutputFormat, BufferTarget, EncodedVideoPacketSource, EncodedPacket } from 'https://cdn.jsdelivr.net/npm/mediabunny@1.32.2/+esm';

export class MediabunnyImageListToVideo {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.frames = []; // 이미지 Blob들을 담는 배열
    }
    async init() {
        return;
    }
    /**
     * 이미지를 리스트에 추가하고 해상도를 설정합니다.
     */
    async addImage(idx, imgBlob) {
        if (this.width === 0) {
            const bitmap = await createImageBitmap(imgBlob);
            // H.264 코덱 호환성을 위해 2의 배수로 해상도 보정
            this.width = Math.ceil(bitmap.width / 2) * 2;
            this.height = Math.ceil(bitmap.height / 2) * 2;
            bitmap.close();
        }
        this.frames.push(imgBlob);
    }

    /**
     * 이미지 리스트를 MP4 영상으로 변환하여 Blob으로 반환합니다.
     */
    async export(fps) {
        return new Promise(async (resolve, reject) => {
            try {
                // 1. 결과물을 담을 타겟과 출력 포맷 설정
                const target = new BufferTarget();
                const format = new Mp4OutputFormat({ 
                    video: 'avc',        // 포맷 수준 코덱 명시
                    fragmented: false    // 단일 moov 구조 강제 (윈도우 호환)
                });

                const output = new Output({
                    format: format,
                    target: target
                });

                // 2. [오류 해결 포인트] 소스 생성 시 코덱 옵션을 반드시 포함
                const videoSource = new EncodedVideoPacketSource('avc');

                output.addVideoTrack(videoSource);
                await output.start();

                const frameDuration = 1000000 / fps;

                // 3. WebCodecs VideoEncoder 설정
                const encoder = new VideoEncoder({
                    output: (chunk) => {
                        // WebCodecs 청크를 Mediabunny 패킷으로 변환하여 소스에 추가
                        const packet = EncodedPacket.fromEncodedChunk(chunk);
                        videoSource.addPacket(packet);
                    },
                    error: (e) => reject(e)
                });

                encoder.configure({
                    codec: 'avc1.4D401F', // Main Profile
                    width: this.width,
                    height: this.height,
                    bitrate: 5_000_000,
                    framerate: fps
                });

                // 4. 이미지 리스트 순회 및 인코딩
                for (let i = 0; i < this.frames.length; i++) {
                    const bitmap = await createImageBitmap(this.frames[i]);
                    const frame = new VideoFrame(bitmap, { 
                        timestamp: i * frameDuration,
                        duration: frameDuration
                    });
                    
                    encoder.encode(frame, { keyFrame: i % 30 === 0 });
                    
                    frame.close();
                    bitmap.close();
                }

                // 5. 종료 시퀀스 (역순으로 확실히 닫아주어야 moov가 생성됨)
                await encoder.flush();
                encoder.close();
                
                videoSource.finalize();  // 데이터 공급 완료 알림
                await output.finalize(); // MP4 최종 구조 빌드 (가장 중요)

                // 6. 결과 반환
                resolve(new Blob([target.buffer], { type: 'video/mp4' }));

            } catch (error) {
                console.error("Export 과정에서 에러 발생:", error);
                reject(error);
            }
        });
    }

    /**
     * 작업 완료 후 내부 리소스 정리
     */
    postprocess() {
        this.frames = [];
        this.width = 0;
        this.height = 0;
        console.log("변환 리소스 정리 완료.");
    }

    /**
     * 외부에서 호출하는 통합 메서드
     */
    async exportImageListToVideo(imageList, fps = 30) {
        for (let i = 0; i < imageList.length; i++) {
            await this.addImage(i, imageList[i]);
        }
        const videoBlob = await this.export(fps);
        this.postprocess();
        return videoBlob;
    }
}