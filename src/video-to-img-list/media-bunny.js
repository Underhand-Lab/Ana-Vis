import {
    Input,
    BlobSource,
    ALL_FORMATS,
} from "https://cdn.jsdelivr.net/npm/mediabunny@1.32.2/+esm";

export class MediaBunnyVideoConverter {
    constructor() {
        this.decoder = null;
    }

    async convert(file) {
        console.log("1. 변환 시작:", file.name);

        const imageList = [];

        // 1️⃣ Mediabunny Input 생성
        const input = new Input({
            source: new BlobSource(file),
            formats: ALL_FORMATS,
        });

        // 비디오 트랙 읽기
        const videoTrack = await input.getPrimaryVideoTrack();
        if (!videoTrack) {
            throw new Error("비디오 트랙을 찾을 수 없습니다.");
        }

        const metadata = {
            width: videoTrack.displayWidth,
            height: videoTrack.displayHeight,
            codec: videoTrack.codec,
        };

        console.log("2. 메타데이터:", metadata);

        // 2️⃣ VideoDecoder 생성
        const config = {
            codec: videoTrack.codec,
            codedWidth: videoTrack.displayWidth,
            codedHeight: videoTrack.displayHeight,
            description: videoTrack.codecDescription, // Codec extradata
        };

        const support = await VideoDecoder.isConfigSupported(config);
        if (!support.supported) {
            throw new Error(`지원되지 않는 코덱: ${config.codec}`);
        }

        this.decoder = new VideoDecoder({
            output: async (frame) => {
                const bmp = await createImageBitmap(frame);
                imageList.push(bmp);
                frame.close();
            },
            error: (e) => console.error("VideoDecoder 오류:", e),
        });

        this.decoder.configure(config);

        // 3️⃣ Packet → WebCodecs 디코딩 루프
        let packet;
        while ((packet = await videoTrack.readPackets())) {
            // Mediabunny EncodedPacket → EncodedVideoChunk
            const chunk = packet.toEncodedVideoChunk();
            this.decoder.decode(chunk);
        }

        await this.decoder.flush();

        console.log("3. 디코딩 완료. 프레임 수:", imageList.length);

        return { imageList, metadata };
    }
}
