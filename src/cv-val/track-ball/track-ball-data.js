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
    }
}

export { TrackBallData };