import { IAnalysisData } from './cvval-types';

export class CVValImageListManager {
    private rawImgListList: ImageBitmap[][] = [];

    setRawImgList(imgList: ImageBitmap[], _index: number) {
        // In this refactoring, we assume _index is always 0 for simplicity,
        // as the original code only ever pushed to rawImgListList and accessed rawImgListList[0].
        // If multi-video support is needed, this logic would require adjustment.
        this.rawImgListList.push(imgList);
    }

    getRawImgList(idx: number): ImageBitmap[] {
        return this.rawImgListList[idx];
    }

    getFrameCnt(): number {
        return this.rawImgListList[0]?.length || 0;
    }

    // 레거시 호환성: 개별 데이터 객체(PoseData 등)가 이미지 리스트를 직접 들고 있는 경우,
    // CVValData의 중앙 이미지 저장소가 비어있다면 해당 리스트를 복사해옵니다.
    copyRawImgListFromData(data: IAnalysisData) {
        if (this.rawImgListList.length === 0 && typeof data.getRawImgList === 'function') {
            const imgList = data.getRawImgList(0);
            if (imgList && imgList.length > 0) {
                this.setRawImgList(imgList, 0);
            }
        }
    }

    // 소유권 이전: CVValData에 이미 이미지가 있다면(혹은 방금 옮겼다면) 메모리 절약을 위해 개별 데이터 객체 내의 이미지 리스트는 항상 비워줍니다.
    clearRawImgListForData(data: IAnalysisData) {
        if (this.rawImgListList.length > 0 && typeof data.clearRawImgList === 'function') {
            data.clearRawImgList();
        }
    }
}