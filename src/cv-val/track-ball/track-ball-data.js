import { MediaBunnyVideoConverter } from "../../video-to-img-list/media-bunny.js"
import { MediabunnyImageListToVideo } from "../../image-list-to-video/media-bunny.js"

class TrackBallData {
    constructor() {
        this.videoMetaDataList = [];
        this.rawImgListList = [];
        // ballList 구조: [ { selectedIdx: 0, candidates: [...] }, ... ]
        this.ballList = [];
    }

    initialize(videoMetaDataList) {
        this.videoMetaDataList = videoMetaDataList;
        this.rawImgListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.ballList = [];
    }
    
    setConf(conf) {
        for (let i = 0; i < this.ballList.length; i++) {
            const frameData = this.ballList[i];
            const currentBall = this.getSelectedBallAt(i);

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

    addDataAt(idx, rawImg, candidates) {
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
    getSelectedBallAt(frameIdx) {
        const frameData = this.ballList[frameIdx];
        if (!frameData || frameData.selectedIdx === -1) return null;

        return frameData.candidates[frameData.selectedIdx] || null;
    }

    /**
     * 사용자가 UI에서 후보를 변경할 때 호출합니다.
     */
    setSelectedIdx(frameIdx, candidateIdx) {
        if (this.ballList[frameIdx]) {
            this.ballList[frameIdx].selectedIdx = candidateIdx;
        }
    }

    /**
     * 특정 프레임의 모든 후보군을 가져옵니다 (드롭다운 생성용).
     */
    getCandidatesAt(frameIdx) {
        return this.ballList[frameIdx]?.candidates || [];
    }

    getVideoMetadata(idx) {
        return this.videoMetaDataList[idx];
    }

    getFrameCnt() {
        return this.rawImgListList[0]?.length || 0;
    }

    getRawImgList(idx) {
        return this.rawImgListList[idx];
    }

    getBallList() {
        return this.ballList;
    }async toBlob() {
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

            const videoBlob = await videoConverter.export(metadata.fps || 30);
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
        const finalParts = [];
        
        // [JSON 영역] 길이(4바이트) + 데이터
        const jsonHeader = new ArrayBuffer(4);
        new DataView(jsonHeader).setUint32(0, jsonBuffer.byteLength, true);
        finalParts.push(jsonHeader, jsonBuffer);

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
    async loadFromFile(file) {
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
    async _imageBitmapToBlob(bitmap) {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
    }

    /** 내부 헬퍼: 비디오 -> ImageBitmap 리스트 (MediaBunnyVideoConverter 활용) */
    async _videoToImageBitmaps(videoBlob) {
        const converter = new MediaBunnyVideoConverter();
        const file = new File([videoBlob], "temp.mp4", { type: "video/mp4" });
        const { imageList } = await converter.convert(file);
        return imageList;
    }
}

export { TrackBallData };