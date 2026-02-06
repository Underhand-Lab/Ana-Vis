/**
 * TrackBatData.js
 * 추적된 배트 후보군 데이터와 원본 프레임 이미지를 관리하는 클래스입니다.
 */
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
}

export { TrackBatData };