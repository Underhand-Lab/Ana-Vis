import {
    Input,
    BlobSource,
    ALL_FORMATS,
    EncodedPacketSink
} from "https://cdn.jsdelivr.net/npm/mediabunny@1.32.2/+esm";

export class MediaBunnyVideoConverter {
    constructor() {
        this.decoder = null;
    }

    async convert(file) {
        const imageList = [];

        const input = new Input({
            source: new BlobSource(file),
            formats: ALL_FORMATS,
        });

        const videoTrack = await input.getPrimaryVideoTrack();
        if (!videoTrack) {
            throw new Error("비디오 트랙을 찾을 수 없습니다.");
        }

        // 1. 회전 정보 및 해상도 파악
        const rotation = videoTrack.rotation || 0;
        const packetStats = await videoTrack.computePacketStats();
        
        // Mediabunny의 displayWidth/Height가 이미 회전된 값을 준다면 그대로 사용합니다.
        const finalWidth = videoTrack.displayWidth;
        const finalHeight = videoTrack.displayHeight;
        
        const metadata = {
            width: finalWidth,
            height: finalHeight,
            fps: packetStats.averagePacketRate,
        };

        // 2. OffscreenCanvas 준비 (초기 크기 설정)
        const canvas = new OffscreenCanvas(finalWidth, finalHeight);
        const ctx = canvas.getContext("2d");

        const decoder = new VideoDecoder({
            output: async (frame) => {
                // 3. 매 프레임마다 출력 캔버스 크기 재확인 (혹시 모를 가변 해상도 대응)
                canvas.width = finalWidth;
                canvas.height = finalHeight;
                
                ctx.clearRect(0, 0, finalWidth, finalHeight);
                ctx.save();

                // 4. 캔버스 중심점에서 회전 수행
                ctx.translate(finalWidth / 2, finalHeight / 2);
                ctx.rotate((rotation * Math.PI) / 180);

                // 5. 그리기 로직
                // 핵심: 회전 각도가 90, 270도인 경우 
                // 그려지는 대상(frame)의 가로/세로는 '회전 전' 기준이어야 정확한 비율로 그려집니다.
                const isRotated = rotation === 90 || rotation === 270;
                const drawWidth = isRotated ? frame.displayHeight : frame.displayWidth;
                const drawHeight = isRotated ? frame.displayWidth : frame.displayHeight;

                // 이미 회전된 좌표계이므로, 원본 프레임의 가로세로를 그대로 넣어줍니다.
                // translate로 중심이 이동되었으므로 음수 절반 값으로 원점을 잡습니다.
                ctx.drawImage(
                    frame,
                    -frame.displayWidth / 2,
                    -frame.displayHeight / 2,
                    frame.displayWidth,
                    frame.displayHeight
                );

                ctx.restore();

                const rotatedBmp = canvas.transferToImageBitmap();
                imageList.push(rotatedBmp);

                frame.close();
            },
            error: (e) => console.error("VideoDecoder 오류:", e),
        });

        const decoderConfig = await videoTrack.getDecoderConfig();
        decoder.configure(decoderConfig);

        const sink = new EncodedPacketSink(videoTrack);
        let packet = await sink.getKeyPacket(0);

        while (packet) {
            const chunk = packet.toEncodedVideoChunk();
            decoder.decode(chunk);
            packet = await sink.getNextPacket(packet);
        }

        await decoder.flush();

        return { imageList, metadata };
    }
}