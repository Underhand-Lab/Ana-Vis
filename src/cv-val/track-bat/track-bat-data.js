import { MediaBunnyVideoConverter } from "../../video-to-img-list/media-bunny.js"
import { MediabunnyImageListToVideo } from "../../image-list-to-video/media-bunny.js"

class TrackBatData {
    constructor() {
        this.videoMetaDataList = [];
        this.rawImgListList = [];
        // batList 구조: [ { selectedIdx: 0, candidates: [candidate1, candidate2, ...] }, ... ]
        this.batList = []; 
        this.conf = 0.55;
    }

    /**
     * 비디오 메타데이터를 기반으로 리스트를 초기화합니다.
     */
    initialize(videoMetaDataList) {
        this.videoMetaDataList = videoMetaDataList;
        this.rawImgListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.batList = []; // 데이터 수집 시점마다 초기화
    }

    /**
     * 특정 프레임의 이미지와 검출된 후보군 배열을 저장합니다.
     * @param {number} idx 비디오 인덱스 (일반적으로 0)
     * @param {HTMLImageElement|HTMLCanvasElement} rawImg 원본 프레임 이미지
     * @param {Array} candidates YOLOBatDetector.process()에서 반환된 후보 배열
     */
    addDataAt(idx, rawImg, candidates) {
        if (!this.rawImgListList[idx]) return;

        this.rawImgListList[idx].push(rawImg);
        
        // 프레임별 데이터 구조 생성
        // 기본값으로 0번(가장 신뢰도 높은 후보)을 선택된 상태로 설정합니다.
        // 후보가 없다면 자동으로 -1(선택 안 함) 처리됩니다.
        this.batList.push({
            selectedIdx: (candidates && candidates.length > 0) ? 0 : -1,
            candidates: candidates || []
        });
    }

    setConf(conf) {
        this.conf = conf;
    }

    getConf() {
        return this.conf;
    }

    /**
     * 현재 저장된 전체 프레임 수를 반환합니다.
     */
    getFrameCnt() {
        if (this.rawImgListList.length > 0 && this.rawImgListList[0]) {
            return this.rawImgListList[0].length;
        }
        return 0;
    }

    /**
     * 원본 이미지 리스트를 반환합니다.
     */
    getRawImgList(idx) {
        return this.rawImgListList[idx];
    }
    
    /**
     * 전체 배트 데이터(후보군 포함) 리스트를 반환합니다.
     */
    getBatList() {
        return this.batList;
    }

    /**
     * 특정 프레임에서 현재 선택된(selectedIdx) 배트 데이터를 반환합니다.
     * @param {number} frameIdx 프레임 번호
     * @returns {Object|null} 선택된 배트 객체 또는 null
     */
    getSelectedBatAt(frameIdx) {
        const frameData = this.batList[frameIdx];
        
        // 1. 데이터가 없거나, 명시적으로 '선택 안 함(-1)'인 경우 null 반환
        if (!frameData || frameData.selectedIdx === -1) {
            return null;
        }
        
        // 2. 선택된 인덱스가 후보군 범위 내에 있는지 확인
        const selectedCandidate = frameData.candidates[frameData.selectedIdx];
        
        // 3. 후보 데이터가 유효하지 않으면 null 반환 (방어적 처리)
        return selectedCandidate || null;
    }

    /**
     * 특정 프레임의 특정 후보를 '진짜'로 확정하거나 취소할 때 사용합니다.
     * @param {number} frameIdx 프레임 번호
     * @param {number} candidateIdx 후보군 중 선택할 인덱스 (선택 해제 시 -1)
     */
    setSelectedIdx(frameIdx, candidateIdx) {
        const frameData = this.batList[frameIdx];
        if (!frameData) return;

        // 1. 선택 해제 요청(-1) 처리
        if (candidateIdx === -1) {
            frameData.selectedIdx = -1;
            return;
        }

        // 2. 유효한 인덱스 범위 확인 후 설정
        const candidatesCount = frameData.candidates.length;
        if (candidateIdx >= 0 && candidateIdx < candidatesCount) {
            frameData.selectedIdx = candidateIdx;
        } else {
            // 범위를 벗어난 잘못된 요청 시 안전하게 선택 해제
            frameData.selectedIdx = -1;
        }
    }

    /**
     * 특정 프레임에 존재하는 모든 후보군을 반환합니다.
     */
    getCandidatesAt(frameIdx) {
        const frameData = this.batList[frameIdx];
        return (frameData && frameData.candidates) ? frameData.candidates : [];
    }

    /**
     * 특정 인덱스의 비디오 메타데이터를 반환합니다.
     */
    getVideoMetadata(idx) {
        return this.videoMetaDataList[idx];
    }

    async toBlob() {
        const videoBlobs = [];
        
        // 1. 이미지 리스트를 비디오(MP4)로 인코딩하여 용량 압축
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

        // 2. 수치 데이터(batList, conf 등) JSON 직렬화
        const jsonInfo = JSON.stringify({
            metadata: this.videoMetaDataList,
            batList: this.batList,
            conf: this.conf
        });
        const jsonBuffer = new TextEncoder().encode(jsonInfo);

        // 3. 단일 바이너리 패키징
        const finalParts = [];
        
        // [구조] JSON길이(4) | JSON데이터 | 비디오개수(4) | (비디오길이(4) | 비디오데이터) 반복
        
        // JSON 파트 기록
        const jsonHeader = new ArrayBuffer(4);
        new DataView(jsonHeader).setUint32(0, jsonBuffer.byteLength, true);
        finalParts.push(jsonHeader, jsonBuffer);

        // 비디오 파트 기록
        const videoCountHeader = new ArrayBuffer(4);
        new DataView(videoCountHeader).setUint32(0, videoBlobs.length, true);
        finalParts.push(videoCountHeader);

        for (const vBlob of videoBlobs) {
            const vSizeHeader = new ArrayBuffer(4);
            new DataView(vSizeHeader).setUint32(0, vBlob.size, true);
            finalParts.push(vSizeHeader, vBlob);
        }

        return new Blob(finalParts, { type: "application/octet-stream" });
    }

    /**
     * 바이너리 파일을 읽어 TrackBatData의 상태를 복원합니다.
     * @param {File|Blob} file 
     */
    async loadFromFile(file) {
        const arrayBuffer = await file.arrayBuffer();
        let offset = 0;
        const view = new DataView(arrayBuffer);

        // 1. JSON 데이터 복원 (설정 및 후보군)
        const jsonSize = view.getUint32(offset, true);
        offset += 4;
        const jsonBuffer = arrayBuffer.slice(offset, offset + jsonSize);
        const jsonText = new TextDecoder().decode(jsonBuffer);
        const parsed = JSON.parse(jsonText);
        offset += jsonSize;

        this.videoMetaDataList = parsed.metadata;
        this.batList = parsed.batList;
        this.conf = parsed.conf || 0.55;

        // 2. 비디오 데이터를 이미지 리스트로 역변환
        const videoCount = view.getUint32(offset, true);
        offset += 4;

        this.rawImgListList = [];
        for (let i = 0; i < videoCount; i++) {
            const videoSize = view.getUint32(offset, true);
            offset += 4;
            const videoBlob = new Blob([arrayBuffer.slice(offset, offset + videoSize)], { type: "video/mp4" });
            offset += videoSize;

            // MediaBunnyVideoConverter를 사용하여 비디오를 프레임별 ImageBitmap으로 복구
            const images = await this._videoToImageBitmaps(videoBlob);
            this.rawImgListList.push(images);
        }
    }

    /** 내부 헬퍼: ImageBitmap -> Blob (JPEG 인코딩) */
    async _imageBitmapToBlob(bitmap) {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
    }

    /** 내부 헬퍼: 비디오 -> ImageBitmap 리스트 */
    async _videoToImageBitmaps(videoBlob) {
        const converter = new MediaBunnyVideoConverter();
        const file = new File([videoBlob], "temp.mp4", { type: "video/mp4" });
        const { imageList } = await converter.convert(file);
        return imageList;
    }
}

export { TrackBatData };