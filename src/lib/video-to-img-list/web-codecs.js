import * as MP4Box from "https://cdn.jsdelivr.net/npm/mp4box@2.3.0/+esm";

export class WebCodecsVideoConverter {
    constructor() {
        this.mp4boxFile = null;
        this.decoder = null;
    }

    /**
     * 비디오 파일을 ImageBitmap 배열로 변환합니다.
     */
    async convert(file) {
        console.log("1. 변환 프로세스 시작:", file.name);

        const buffer = await file.arrayBuffer();
        const imageList = [];
        let metadata = null;

        return new Promise((resolve, reject) => {
            this.mp4boxFile = MP4Box.createFile();

            this.mp4boxFile.onReady = (info) => {
                console.log("3. MP4Box 메타데이터 준비 완료");

                const track = info.videoTracks[0];
                if (!track) {
                    reject(new Error("비디오 트랙을 찾을 수 없습니다."));
                    return;
                }
                const durationSec = track.duration / track.timescale;
                const fps = track.nb_samples / durationSec;

                metadata = {
                    width: track.track_width,
                    height: track.track_height,
                    fps: fps,
                    codec: track.codec,
                    sampleCount: track.nb_samples,
                    id: track.id
                };

                console.log("4. 수집된 메타데이터:", metadata);

                this.setupDecoder(track, imageList, resolve, reject, metadata, buffer);
            };

            this.mp4boxFile.onError = (e) => {
                console.error("MP4Box 에러 발생:", e);
                reject(e);
            };

            buffer.fileStart = 0;
            this.mp4boxFile.appendBuffer(buffer);
            this.mp4boxFile.flush();
        });
    }

    /**
     * [수정됨] VideoDecoder 설정 및 샘플 추출 로직
     */
    async setupDecoder(track, imageList, resolve, reject, metadata, buffer) {
        console.log("6. VideoDecoder 설정 시작");

        const extradata = this.getExtradata(track);
        
        // 1. [핵심] 기본 설정 객체 생성 (속성 없이 생성 후 동적 추가)
        const config = {
            codec: track.codec,
            codedWidth: track.track_width,
            codedHeight: track.track_height,
        };

        // 2. [핵심] description이 존재하고 유효할 때만 config에 추가 (null 대입 방지)
        if (extradata && extradata.byteLength > 0) {
            config.description = extradata;
            console.log("6-1. description 주입 성공:", extradata.byteLength, "bytes");
        } else {
            console.warn("6-1. description을 찾지 못해 속성에서 제외합니다.");
        }

        try {
            // 3. 지원 여부 확인
            const support = await VideoDecoder.isConfigSupported(config);
            console.log("6-2. 브라우저 코덱 지원 여부:", support.supported);
            
            if (!support.supported) {
                throw new Error(`이 브라우저는 코덱(${config.codec}) 설정을 지원하지 않습니다.`);
            }

            this.decoder = new VideoDecoder({
                output: (frame) => {
                    createImageBitmap(frame).then((bmp) => {
                        imageList.push(bmp);
                        frame.close();
                    });
                },
                error: (e) => {
                    console.error("VideoDecoder 실행 중 오류:", e);
                    reject(e);
                }
            });

            this.decoder.configure(config);
            console.log("6-3. VideoDecoder 구성 완료");

            this.mp4boxFile.onSamples = async (id, user, samples) => {
                console.log(`7. 샘플 수신됨: ${samples.length}개 처리 중...`);

                for (const s of samples) {
                    this.decoder.decode(new EncodedVideoChunk({
                        type: s.is_sync ? "key" : "delta",
                        timestamp: (s.cts / s.timescale) * 1e6,
                        duration: (s.duration / s.timescale) * 1e6,
                        data: s.data
                    }));
                }

                await this.decoder.flush();
                
                setTimeout(() => {
                    console.log("9. 전체 프레임 처리 완료! 총 개수:", imageList.length);
                    resolve({ imageList, metadata });
                }, 500);
            };

            const extractFn = this.mp4boxFile.setExtractionConfig || this.mp4boxFile.setExtractionOptions;
            if (typeof extractFn === 'function') {
                extractFn.call(this.mp4boxFile, track.id, null, { nb_samples: track.nb_samples });
            } else {
                this.mp4boxFile.setExtractingTrack(track.id);
            }

            this.mp4boxFile.start();

            // 4. 샘플 추출 트리거를 위한 재주입
            console.log("6-4. 샘플 추출 데이터 재주입");
            const retryBuffer = buffer.slice(0);
            retryBuffer.fileStart = 0;
            this.mp4boxFile.appendBuffer(retryBuffer);
            this.mp4boxFile.flush();

        } catch (e) {
            console.error("setupDecoder 과정 중 에러 발생:", e);
            reject(e);
        }
    }

    /**
     * [수정됨] extradata(avcC/hvcC) 추출 경로 강화
     */
    getExtradata(track) {
        try {
            let box = null;
            
            // 경로 1: 표준 데이터 구조 탐색
            const entry = track.mdia?.minf?.stbl?.stsd?.entries?.[0] || track.stsd?.entries?.[0];
            if (entry) {
                box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
            }

            // 경로 2: MP4Box 인스턴스 원본 트랙에서 직접 탐색
            if (!box && this.mp4boxFile) {
                const rawTrack = this.mp4boxFile.getTrackById(track.id);
                const rawEntry = rawTrack?.mdia?.minf?.stbl?.stsd?.entries?.[0];
                box = rawEntry?.avcC || rawEntry?.hvcC;
            }

            if (!box) return null;

            const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
            box.write(stream);

            // 박스 헤더 8바이트를 제외한 독립된 ArrayBuffer 생성
            if (stream.buffer.byteLength <= 8) return null;
            return stream.buffer.slice(8);
        } catch (e) {
            console.error("extradata 추출 실패:", e);
            return null;
        }
    }
}