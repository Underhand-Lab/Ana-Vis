import { CVValData } from './cvval-data';

/**
 * 분석 타입을 문자열로 정의하여 확장성을 확보합니다.
 * 기본적으로 AnalysisDataMap의 키들을 포함하지만, 임의의 문자열도 허용합니다.
 */
export type AnalysisType = string;

export interface IAnalysisData {
    toBlob(dataOnly?: boolean): Promise<Blob>;
    getRawImgList?(idx: number): ImageBitmap[];
    clearRawImgList?(): void; // 메모리 해제를 위한 메서드 추가
}

/**
 * 2차 분석 플러그인 인터페이스
 */
export interface IAnalysisTool {
    name: string;
    setData(data: CVValData): void;
    getResult(idx: number): Record<string, (number | null)> | null;
    getResults(): Record<string, (number | null)[]> | null;
    locales?: Record<string, any>;
}