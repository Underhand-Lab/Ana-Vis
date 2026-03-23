import {
    Input,
    BlobSource,
    ALL_FORMATS,
    EncodedPacketSink
} from "mediabunny";

export class MediaBunnyVideoConverter {
    constructor() {
        this.decoder = null;
    }

    async convert(file) {
        // 임시로 프레임과 타임스탬프를 함께 저장할 배열
        const frameData = [];

        const input = new Input({
            source: new BlobSource(file),
            formats: ALL_FORMATS,
        });

        const videoTrack = await input.getPrimaryVideoTrack();
        if (!videoTrack) {
            throw new Error("비디오 트랙을 찾을 수 없습니다.");
        }

        // 1. 메타데이터 파악
        const rotation = videoTrack.rotation || 0;
        const packetStats = await videoTrack.computePacketStats();
        
        const finalWidth = videoTrack.displayWidth;
        const finalHeight = videoTrack.displayHeight;
        
        const metadata = {
            width: finalWidth,
            height: finalHeight,
            fps: packetStats.averagePacketRate,
        };

        // 2. OffscreenCanvas 준비
        const canvas = new OffscreenCanvas(finalWidth, finalHeight);
        const ctx = canvas.getContext("2d");

        const decoder = new VideoDecoder({
            output: (frame) => {
                // ✅ 중요: 프레임의 고유 타임스탬프 확보
                const timestamp = frame.timestamp;

                canvas.width = finalWidth;
                canvas.height = finalHeight;
                
                ctx.clearRect(0, 0, finalWidth, finalHeight);
                ctx.save();

                // 3. 회전 처리 로직
                ctx.translate(finalWidth / 2, finalHeight / 2);
                ctx.rotate((rotation * Math.PI) / 180);

                // 캔버스 중심점에서 원본 프레임을 그림
                ctx.drawImage(
                    frame,
                    -frame.displayWidth / 2,
                    -frame.displayHeight / 2,
                    frame.displayWidth,
                    frame.displayHeight
                );

                ctx.restore();

                // 4. 비트맵 추출 및 임시 저장 (타임스탬프 포함)
                const rotatedBmp = canvas.transferToImageBitmap();
                frameData.push({
                    timestamp: timestamp,
                    bitmap: rotatedBmp
                });

                frame.close();
            },
            error: (e) => console.error("VideoDecoder 오류:", e),
        });

        const decoderConfig = await videoTrack.getDecoderConfig();
        decoder.configure(decoderConfig);

        const sink = new EncodedPacketSink(videoTrack);
        let packet = await sink.getKeyPacket(0);

        // 5. 패킷 디코딩 루프
        while (packet) {
            const chunk = packet.toEncodedVideoChunk();
            decoder.decode(chunk);
            packet = await sink.getNextPacket(packet);
        }

        // 모든 디코딩 작업이 완료될 때까지 대기
        await decoder.flush();

        // 6. ✅ 핵심: 타임스탬프 순서대로 정렬
        // 비동기적으로 push된 프레임들을 시간순으로 재배치합니다.
        frameData.sort((a, b) => a.timestamp - b.timestamp);
        
        // 정렬된 데이터에서 ImageBitmap만 추출하여 최종 리스트 생성
        const imageList = frameData.map(item => item.bitmap);

        return { imageList, metadata };
    }
}