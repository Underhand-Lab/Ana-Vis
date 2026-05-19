import { CVValData } from "@/features/cv-val/core/cvval-data";

/**
 * 비디오 레이어 렌더링을 위한 전략 인터페이스
 */
export interface IVideoStrategy {
    /** 대상 분석 타입 (e.g., 'pose', 'ball', 'bat') */
    type: string;
    
    /** 
     * 캔버스에 그리기 수행
     * @param ctx 캔버스 2D 컨텍스트
     * @param data CVValData에서 가져온 해당 타입의 데이터
     * @param frameIdx 현재 프레임 번호
     * @param settings 시각화 설정 (색상, 선 굵기 등)
     */
    draw(ctx: CanvasRenderingContext2D, data: any, frameIdx: number, settings: any): void;
}