import { MediaBunnyVideoToImageList, VideoMetadata }
    from "@common/lib/video-to-img-list/media-bunny";
import { MediabunnyImageListToVideo }
    from "@common/lib/image-list-to-video/media-bunny";
import { DetectedObject } from "./ball-detector/yolo";

interface BallFrameData {
    selectedIdx: number;
    candidates: DetectedObject[];
}

export class TrackBallData {
    private videoMetaDataList: VideoMetadata[] = [];
    private rawImgListList: ImageBitmap[][] = [];
    /** ballList 구조: [ { selectedIdx: 0, candidates: [...] }, ... ] */
    private ballList: BallFrameData[] = [];
    private conf: number = 0.1;

    constructor() {}

    initialize(videoMetaDataList: VideoMetadata[]): void {
        this.videoMetaDataList = videoMetaDataList;
        this.rawImgListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.ballList = [];
    }
    
    setConf(conf: number): void {
        this.conf = conf;
        for (let i = 0; i < this.ballList.length; i++) {
            const frameData = this.ballList[i];
            // getSelectedBallAt이 null을 반환할 수 있으므로 타입 단언 혹은 체크 필요
            const currentBall = this.getSelectedBallAt(i) as DetectedObject | null;

            // 1. 현재 선택된 후보가 있고, 그 신뢰도가 기준치(conf)보다 높다면 그대로 유지
            if (currentBall && currentBall.confidence >= conf) {
                continue;
            }

            // 2. 현재 상태가 기준치보다 낮거나 선택되지 않은 경우, 후보군 중 기준치보다 높은 게 있는지 확인
            // candidates는 이미 Detector에서 신뢰도 순으로 정렬되어 반환되므로 0번째 인덱스가 가장 높은 값임
            if (frameData.candidates && frameData.candidates.length > 0) {
                const bestCandidate = frameData.candidates[0];

                if (bestCandidate.confidence >= conf) {
                    // 후보 중 가장 높은 값이 기준치보다 높다면 그 후보로 변경 (index 0)
                    this.setSelectedIdx(i, 0);
                    continue;
                }
            }

            // 3. 현재 선택된 것도 기준치 미달이고, 후보 중에도 기준치보다 높은 게 없다면 None(-1) 처리
            this.setSelectedIdx(i, -1);
        }
    }

    getConf() {
        this.conf;
    }

    addDataAt(idx: number, rawImg: ImageBitmap, candidates: DetectedObject[]): void {
        if (!this.rawImgListList[idx]) return;

        this.rawImgListList[idx].push(rawImg);

        // 기본적으로 가장 신뢰도 높은 0번 선택, 후보 없으면 -1(선택 안 함)
        this.ballList.push({
            selectedIdx: (candidates && candidates.length > 0) ? 0 : -1,
            candidates: candidates || []
        });
    }

    /**
     * 특정 프레임에서 현재 선택된 공 데이터를 반환합니다.
     */
    getSelectedBallAt(frameIdx: number): DetectedObject | null {
        const frameData = this.ballList[frameIdx];
        if (!frameData || frameData.selectedIdx === -1) return null;

        return frameData.candidates[frameData.selectedIdx] || null;
    }

    /**
     * 사용자가 UI에서 후보를 변경할 때 호출합니다.
     */
    setSelectedIdx(frameIdx: number, candidateIdx: number): void {
        if (this.ballList[frameIdx]) {
            this.ballList[frameIdx].selectedIdx = candidateIdx;
        }
    }

    /**
     * 특정 프레임의 모든 후보군을 가져옵니다 (드롭다운 생성용).
     */
    getCandidatesAt(frameIdx: number): DetectedObject[] {
        return this.ballList[frameIdx]?.candidates || [];
    }

    getVideoMetadata(idx: number): VideoMetadata {
        return this.videoMetaDataList[idx];
    }

    getFrameCnt(): number {
        return this.rawImgListList[0]?.length || 0;
    }

    getRawImgList(idx: number): ImageBitmap[] {
        return this.rawImgListList[idx];
    }

    getBallList(): BallFrameData[] {
        return this.ballList;
    }

    async toBlob(): Promise<Blob> {
        const videoBlobs = [];
        
        // 1. 이미지 리스트를 비디오(MP4)로 인코딩
        for (let i = 0; i < this.rawImgListList.length; i++) {
            const imageList = this.getRawImgList(i);
            const metadata = this.getVideoMetadata(i);
            
            if (!imageList || imageList.length === 0) continue;

            const videoConverter = new MediabunnyImageListToVideo();
            for (const img of imageList) {
                const blob = await this._imageBitmapToBlob(img);
                await videoConverter.addImage(i, blob);
            }
            
            if (!videoConverter.export) throw new Error("Exporter not found");

            const videoBlob = await (videoConverter as any).export(metadata.fps || 30);
            videoBlobs.push(videoBlob);
            videoConverter.postprocess();
        }

        // 2. 수치 데이터(ballList 등) JSON 직렬화
        const jsonInfo = JSON.stringify({
            metadata: this.videoMetaDataList,
            ballList: this.ballList
        });
        const jsonBuffer = new TextEncoder().encode(jsonInfo);

        // 3. 바이너리 조립
        const finalParts: (ArrayBuffer | Blob)[] = [];
        
        // [JSON 영역] 길이(4바이트) + 데이터
        const jsonHeader = new ArrayBuffer(4);
        new DataView(jsonHeader).setUint32(0, jsonBuffer.byteLength, true);
        finalParts.push(jsonHeader, jsonBuffer.buffer);

        // [비디오 영역] 개수(4바이트) + (길이(4) + 데이터) 반복
        const videoCountHeader = new ArrayBuffer(4);
        new DataView(videoCountHeader).setUint32(0, videoBlobs.length, true);
        finalParts.push(videoCountHeader);

        for (const vBlob of videoBlobs) {
            const vSizeHeader = new ArrayBuffer(4);
            new DataView(vSizeHeader).setUint32(0, vBlob.size, true);
            finalParts.push(vSizeHeader, vBlob);
        }

        return new Blob(finalParts, { type: "application/cvbl" });
    }

    /**
     * 바이너리 파일을 읽어 클래스 상태 복원
     */
    async loadFromFile(file: File | Blob): Promise<void> {
        const arrayBuffer = await file.arrayBuffer();
        let offset = 0;
        const view = new DataView(arrayBuffer);

        // 1. JSON 데이터 복원
        const jsonSize = view.getUint32(offset, true);
        offset += 4;
        const jsonBuffer = arrayBuffer.slice(offset, offset + jsonSize);
        const jsonText = new TextDecoder().decode(jsonBuffer);
        const parsed = JSON.parse(jsonText);
        offset += jsonSize;

        this.videoMetaDataList = parsed.metadata;
        this.ballList = parsed.ballList;

        // 2. 비디오 데이터로부터 이미지 리스트 복원
        const videoCount = view.getUint32(offset, true);
        offset += 4;

        this.rawImgListList = [];
        for (let i = 0; i < videoCount; i++) {
            const videoSize = view.getUint32(offset, true);
            offset += 4;
            const videoBlob = new Blob([arrayBuffer.slice(offset, offset + videoSize)], { type: "video/mp4" });
            offset += videoSize;

            const images = await this._videoToImageBitmaps(videoBlob);
            this.rawImgListList.push(images);
        }
    }

    /** 내부 헬퍼: ImageBitmap -> Blob */
    private async _imageBitmapToBlob(bitmap: ImageBitmap): Promise<Blob> {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context creation failed");
        ctx.drawImage(bitmap, 0, 0);
        return new Promise((res) => {
            canvas.toBlob((blob) => res(blob!), 'image/jpeg', 0.9);
        });
    }

    /** 내부 헬퍼: 비디오 -> ImageBitmap 리스트 (MediaBunnyVideoConverter 활용) */
    private async _videoToImageBitmaps(videoBlob: Blob): Promise<ImageBitmap[]> {
        const converter = new MediaBunnyVideoToImageList();
        const file = new File([videoBlob], "temp.mp4", { type: "video/mp4" });
        const { imageList } = await converter.convert(file);
        return imageList;
    }
}