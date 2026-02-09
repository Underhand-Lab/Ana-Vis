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

        const rotation = videoTrack.rotation || 0;
        
        const isVertical = rotation === 90 || rotation === 270;
        const finalWidth = isVertical ? videoTrack.displayHeight : videoTrack.displayWidth;
        const finalHeight = isVertical ? videoTrack.displayWidth : videoTrack.displayHeight;
        
        const packetStats = await videoTrack.computePacketStats();
        const metadata = {
            width: finalWidth,
            height: finalHeight,
            fps: packetStats.averagePacketRate,
        };

        const canvas = new OffscreenCanvas(finalWidth, finalHeight);
        const ctx = canvas.getContext("2d");

        const decoder = new VideoDecoder({
            output: async (frame) => {
                // 캔버스 초기화 및 회전 설정
                canvas.width = finalWidth;
                canvas.height = finalHeight;
                
                ctx.clearRect(0, 0, finalWidth, finalHeight);
                ctx.save();

                // 캔버스 중심점을 기준으로 회전 변환
                ctx.translate(finalWidth / 2, finalHeight / 2);
                ctx.rotate((rotation * Math.PI) / 180);

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