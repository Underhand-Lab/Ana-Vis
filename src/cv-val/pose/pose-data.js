import { MediaBunnyVideoConverter } from "../../video-to-img-list/media-bunny.js"
import { MediabunnyImageListToVideo } from "../../image-list-to-video/media-bunny.js"

class PoseData {
    constructor() {
        this.rawImgListList = [];
        this.landmarks3dList = [];
        this.landmarks2dListList = [];
        this.visibilityScoreListList = [];
    }

    initialize(videoMetaDataList) {

        this.videoMetaDataList = videoMetaDataList;

        this.rawImgListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.landmarks2dListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.visibilityScoreListList = Array.from({ length: videoMetaDataList.length }, () => []);

    }

    addDataAt(idx, rawImg, data) {
        this.rawImgListList[idx].push(rawImg);
        this.landmarks2dListList[idx].push(data.landmarks2dList[idx]);
        this.visibilityScoreListList[idx].push(data.visibilityScoreList[idx]);

        this.landmarks3dList.push(data.landmarks3d);
    }

    getVideoMetadata(idx) {
        return this.videoMetaDataList[idx];
    }

    getFrameCnt() {
        if (this.rawImgListList.length > 0) {
            return this.rawImgListList[0].length;
        }
        return 0;
    }

    getRawImgList(idx) {
        return this.rawImgListList[idx];
    }

    getLandmarks3d() {
        return this.landmarks3dList;
    }

    getLandmarks2dList(idx) {
        return this.landmarks2dListList[idx];
    }

    getVisibilityScoreList(idx) {
        return this.visibilityScoreListList[idx];
    }
    
    async toBlob() {
        const videoBlobs = [];
        
        // 1. 각 시점별 이미지를 비디오(MP4)로 인코딩
        for (let i = 0; i < this.rawImgListList.length; i++) {
            const imageList = this.getRawImgList(i);
            const metadata = this.getVideoMetadata(i);
            
            if (!imageList || imageList.length === 0) continue;

            const videoConverter = new MediabunnyImageListToVideo();
            
            for (const img of imageList) {
                // ImageBitmap을 Blob으로 변환하여 추가
                const blob = await this._imageBitmapToBlob(img);
                await videoConverter.addImage(i, blob);
            }

            // 인코딩 후 Blob 생성
            const videoBlob = await videoConverter.export(metadata.fps || 30);
            videoBlobs.push(videoBlob);
            videoConverter.postprocess();
        }

        // 2. 수치 데이터 구조화
        const jsonInfo = JSON.stringify({
            metadata: this.videoMetaDataList,
            landmarks3d: this.landmarks3dList,
            landmarks2d: this.landmarks2dListList,
            visibility: this.visibilityScoreListList
        });

        const jsonBuffer = new TextEncoder().encode(jsonInfo);
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

        // 3. 브라우저 다운로드 실행
        const combinedBlob = new Blob(finalParts, { type: "application/cvp" });

        return combinedBlob;
    }

    /**
     * 내부 헬퍼: ImageBitmap -> Blob 변환
     */
    async _imageBitmapToBlob(bitmap) {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
    }

    /**
     * 내부 헬퍼: 브라우저 다운로드 트리거
     */
    _triggerDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    async loadFromFile(file) {
        const arrayBuffer = await file.arrayBuffer();
        let offset = 0;
        const view = new DataView(arrayBuffer);

        // 1. JSON 데이터 읽기
        const jsonSize = view.getUint32(offset, true);
        offset += 4;
        
        const jsonBuffer = arrayBuffer.slice(offset, offset + jsonSize);
        offset += jsonSize;
        
        const jsonText = new TextDecoder().decode(jsonBuffer);
        const parsed = JSON.parse(jsonText);

        // 2. 클래스 기본 속성 복원
        this.videoMetaDataList = parsed.metadata;
        this.landmarks3dList = parsed.landmarks3d;
        this.landmarks2dListList = parsed.landmarks2d;
        this.visibilityScoreListList = parsed.visibility;

        // 3. 비디오 데이터 읽기 및 이미지 리스트 복원
        const videoCount = view.getUint32(offset, true);
        offset += 4;

        this.rawImgListList = [];

        for (let i = 0; i < videoCount; i++) {
            const videoSize = view.getUint32(offset, true);
            offset += 4;

            const videoBlob = new Blob([arrayBuffer.slice(offset, offset + videoSize)], { type: "video/mp4" });
            offset += videoSize;

            // 비디오 Blob을 다시 ImageBitmap 배열로 변환 (역변환)
            // ※ 주의: 비디오를 다시 이미지 리스트로 만드는 것은 비동기 작업이며 
            // 이전에 사용한 MediaBunnyVideoConverter(media-bunny.js)를 활용합니다.
            const images = await this._videoToImageBitmaps(videoBlob);
            this.rawImgListList.push(images);
        }
        
        console.log("데이터 로드 완료:", this);
    }

    async _videoToImageBitmaps(videoBlob) {
        // media-bunny.js에서 내보낸 클래스를 사용한다고 가정
        const converter = new MediaBunnyVideoConverter();
        const file = new File([videoBlob], "temp.mp4", { type: "video/mp4" });
        const { imageList } = await converter.convert(file);
        return imageList;
    }
}

export { PoseData };