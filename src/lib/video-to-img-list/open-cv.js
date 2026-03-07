import { cv } from "../external/opencv.js";

export class VideoConverter {
    constructor(options = {}) {

        this.isLoaded = false;
    }

    /**
     * FFmpeg 라이브러리를 로드합니다.
     */
    async load() {
        return;
    }

    /**
     * 비디오 파일을 이미지 리스트로 변환합니다.
     * @param {File} file 변환할 비디오 파일
     * @returns {Promise<string[]>} 이미지 URL(Blob URL) 배열
     */
    async convert(file) {

        if (!file) {
            throw new Error('비디오 파일이 없습니다.');
        }
        if (!this.isLoaded) {
            await this.load();
        }

        const outputFileName = 'output_%d.jpg';
        const inputFileName = file.name;

        try {
            const imageList = [];
              
            // 5. 이미지 URL 리스트 반환
            return imageList;

        } catch (error) {
            console.error('비디오 변환 중 오류 발생:', error);
            throw error;
        }
    }
}
