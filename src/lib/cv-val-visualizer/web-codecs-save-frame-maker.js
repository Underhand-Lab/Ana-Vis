import * as MP4Box from "https://cdn.jsdelivr.net/npm/mp4box@2.3.0/+esm";

export class SaveFrameMaker {
    constructor(frameMaker) {
        this.frameMaker = frameMaker;
    }

    async export(trackData) {
        console.log("🚀 MP4 내보내기 시작 (MP4Box 객체 호환 모드)...");
        const frameCount = trackData.getFrameCnt();
        const meta = trackData.getVideoMetadata(0);
        const fps = meta.fps || 24;
        const width = Math.floor(meta.width / 2) * 2;
        const height = Math.floor(meta.height / 2) * 2;

        const TIMESCALE = 90000;
        const mp4boxFile = MP4Box.createFile();
        let trackId = null;

        return new Promise(async (resolve, reject) => {
            const encoder = new VideoEncoder({
                output: (chunk, config) => {
                    if (trackId === null) {
                        let avcC_buffer = null;
                        if (config?.description) {
                            avcC_buffer = new Uint8Array(config.description);
                        } else {
                            avcC_buffer = this._extractAvcCFromChunk(chunk);
                        }

                        if (!avcC_buffer) {
                            console.error("❌ 헤더 추출 실패");
                            return;
                        }

                        // [핵심 해결책] 단순 Uint8Array를 MP4Box가 원하는 Box 객체로 변환
                        const trackOptions = {
                            timescale: TIMESCALE,
                            width: width,
                            height: height,
                            brands: ['isom', 'iso2', 'avc1', 'mp41'],
                            codec: 'avc1.42E01E'
                        };

                        trackId = mp4boxFile.addTrack(trackOptions);
                        
                        // MP4Box 내부의 avcC 박스를 찾아 데이터를 주입합니다.
                        const trak = mp4boxFile.getTrackById(trackId);
                        const avccBox = trak.mdia.minf.stbl.stsd.entries[0].avcC;
                        if (avccBox) {
                            const stream = new MP4Box.DataStream(avcC_buffer, 0, MP4Box.DataStream.BIG_ENDIAN);
                            avccBox.parse(stream);
                        }
                        
                        console.log("✅ 트랙 및 avcC 박스 설정 완료");
                    }

                    const data = this._annexBToAvc(chunk);
                    const ts = Math.round(chunk.timestamp * TIMESCALE / 1e6);

                    mp4boxFile.addSample(trackId, data, {
                        duration: Math.round(TIMESCALE / fps),
                        dts: ts,
                        cts: ts,
                        is_sync: chunk.type === "key"
                    });
                },
                error: (e) => reject(e)
            });

            encoder.configure({
                codec: "avc1.42E01E",
                width: width,
                height: height,
                bitrate: 3_000_000,
                framerate: fps,
                avc: { format: "annexb" } 
            });

            for (let i = 0; i < frameCount; i++) {
                const canvas = this.frameMaker.getImageAt(i);
                if (!canvas) continue;
                const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / fps) });
                encoder.encode(frame, { keyFrame: i % 30 === 0 });
                frame.close();
            }

            try {
                await encoder.flush();
                encoder.close();

                mp4boxFile.flush();
                const buffer = mp4boxFile.getBuffer();
                const blob = new Blob([buffer], { type: 'video/mp4' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analysis_final_${Date.now()}.mp4`;
                a.click();
                console.log("🎉 저장 성공!");
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    _annexBToAvc(chunk) {
        const input = new Uint8Array(chunk.byteLength);
        chunk.copyTo(input);
        let i = 0;
        const result = [];
        while (i < input.length) {
            if (input[i] === 0 && input[i+1] === 0 && input[i+2] === 0 && input[i+3] === 1) {
                let start = i + 4;
                let end = start;
                while (end < input.length - 4 && !(input[end] === 0 && input[end+1] === 0 && input[end+2] === 0 && input[end+3] === 1)) {
                    end++;
                }
                const nalu = input.slice(start, end);
                const lenField = new Uint8Array(4);
                new DataView(lenField.buffer).setUint32(0, nalu.length);
                result.push(lenField, nalu);
                i = end;
            } else { i++; }
        }
        const totalLen = result.reduce((acc, cur) => acc + cur.length, 0);
        const combined = new Uint8Array(totalLen);
        let pos = 0;
        for (const part of result) { combined.set(part, pos); pos += part.length; }
        return combined;
    }

    _extractAvcCFromChunk(chunk) {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        let sps = null, pps = null;
        let i = 0;
        while (i < data.length - 4) {
            if (data[i] === 0 && data[i+1] === 0 && data[i+2] === 0 && data[i+3] === 1) {
                const type = data[i+4] & 0x1f;
                let end = i + 4;
                while (end < data.length - 4 && !(data[end] === 0 && data[end+1] === 0 && data[end+2] === 0 && data[end+3] === 1)) { end++; }
                const nal = data.slice(i + 4, end);
                if (type === 7) sps = nal;
                else if (type === 8) pps = nal;
                i = end;
            } else { i++; }
        }
        if (sps && pps) {
            const avcC = new Uint8Array(11 + sps.length + pps.length);
            avcC.set([1, sps[1], sps[2], sps[3], 0xff, 0xe1, sps.length >> 8, sps.length & 0xff]);
            avcC.set(sps, 8);
            const ppsPos = 8 + sps.length;
            avcC.set([1, pps.length >> 8, pps.length & 0xff], ppsPos);
            avcC.set(pps, ppsPos + 3);
            return avcC;
        }
        return null;
    }
}