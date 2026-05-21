import React, { useRef, useEffect, useState, useMemo } from 'react';
import Modal from '@shared/components/Modal.tsx';
import { Div, InputNumber, Button } from '@shared/bridges/UIBridge.ts';
import CanvasRenderer, { CanvasRendererHandle } from "@shared/components/ui-brick/react-web/custom/CanvasRenderer";
import { CVValData } from '@packages/cv-val/core/cvval-data';
import { useTranslation } from 'react-i18next';

interface TrackingEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialFrame: number;
    maxFrame: number;
    confValue: number;
    onConfChange: (e: any) => void;
    data: CVValData | null;
    type: string;
    getTrailLayer: (idx: number, len?: number) => HTMLCanvasElement | null;
    getEditLayer?: (idx: number, candidates: any[], selectedIdx: number) => HTMLCanvasElement | null;
    onCandidateSelect: (frameIdx: number, candidateIdx: number) => void;
}

const TrackingEditorModal: React.FC<TrackingEditorModalProps> = ({
    isOpen, onClose, initialFrame, maxFrame,
    confValue, onConfChange, data, type, getTrailLayer, getEditLayer, onCandidateSelect
}) => {
    const { t } = useTranslation();
    const rendererRef = useRef<CanvasRendererHandle>(null);
    const [localIdx, setLocalIdx] = useState(initialFrame);

    useEffect(() => {
        if (isOpen) {
            setLocalIdx(initialFrame);
        }
    }, [isOpen, initialFrame]);

    const localCandidates = useMemo(() => {
        if (!data || !data.exist(type)) return [];
        const targetData = data.get(type) as any;
        return targetData.getCandidatesAt(localIdx) || [];
    }, [data, localIdx]);

    const localSelectedIdx = useMemo(() => {
        if (!data || !data.exist(type)) return -1;
        const targetData = data.get(type) as any;
        const list = targetData.getBallList ? targetData.getBallList() : targetData.getBatList();
        return list ? (list[localIdx]?.selectedIdx ?? -1) : -1;
    }, [data, localIdx]);

    const localCandidateBoxes = useMemo(() => {
        if (!data || localCandidates.length === 0) return [];
        
        const rawImgList = data.getRawImgList(0);
        const img = rawImgList ? rawImgList[localIdx] : null;
        const imgW = img?.width || 1;
        const imgH = img?.height || 1;

        return localCandidates.map((c: any) => {
            const obj = c as any;
            if (obj.bbox && typeof obj.bbox[0] === 'number' && obj.bbox.length >= 4) {
                return { x: obj.bbox[0], y: obj.bbox[1], w: obj.bbox[2], h: obj.bbox[3] };
            }
            if (obj.maskConfidenceMap) {
                const rows = obj.maskConfidenceMap.length;
                const cols = obj.maskConfidenceMap[0].length;
                let minX = cols, maxX = 0, minY = rows, maxY = 0;
                let found = false;
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        if (obj.maskConfidenceMap[y][x] > 0.1) {
                            if (x < minX) minX = x; if (x > maxX) maxX = x;
                            if (y < minY) minY = y; if (y > maxY) maxY = y;
                            found = true;
                        }
                    }
                }
                if (found) {
                    const sx = imgW / cols;
                    const sy = imgH / rows;
                    return { 
                        x: minX * sx, 
                        y: minY * sy, 
                        w: (maxX - minX + 1) * sx, 
                        h: (maxY - minY + 1) * sy 
                    };
                }
            }
            return { x: 0, y: 0, w: 0, h: 0 };
        });
    }, [data, localIdx, localCandidates]);

    const handleLocalCandidateSelect = (candIdx: number) => {
        onCandidateSelect(localIdx, candIdx);
        if (localIdx < maxFrame) {
            setLocalIdx(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (!isOpen || !rendererRef.current || !data) return;

        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList ? rawImgList[localIdx] : null;
        if (!backgroundImage) return;

        // 1. Hook을 이용한 편집용 레이어 생성 (객체 박스 포함)
        // getEditLayer가 없으면 기존처럼 getTrailLayer 사용
        const overlayLayer = getEditLayer 
            ? getEditLayer(localIdx, localCandidates, localSelectedIdx)
            : getTrailLayer(localIdx, 1);

        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = backgroundImage.width;
        compositeCanvas.height = backgroundImage.height;
        const compositeCtx = compositeCanvas.getContext('2d');
        if (!compositeCtx) return;

        compositeCtx.drawImage(backgroundImage, 0, 0);
        if (overlayLayer) {
            compositeCtx.drawImage(overlayLayer, 0, 0, backgroundImage.width, backgroundImage.height);
        }

        // getEditLayer가 없거나 미흡할 경우를 대비해 candidateBoxes를 직접 그려 시각화 보장
        localCandidateBoxes.forEach((box: any, i: number) => {
            const isSelected = localSelectedIdx === i;
            compositeCtx.strokeStyle = isSelected ? '#007bff' : 'rgba(255, 255, 0, 0.6)';
            compositeCtx.lineWidth = isSelected ? 4 : 2;
            compositeCtx.strokeRect(box.x, box.y, box.w, box.h);

            if (!getEditLayer) {
                compositeCtx.fillStyle = isSelected ? '#007bff' : 'rgba(0, 0, 0, 0.5)';
                compositeCtx.fillRect(box.x, box.y - 25, 30, 25);
                compositeCtx.fillStyle = 'white';
                compositeCtx.font = 'bold 16px Arial';
                compositeCtx.fillText(`${i + 1}`, box.x + 5, box.y - 7);
            }
        });

        // 2. CanvasRenderer에 그리기
        rendererRef.current.updateLayout(compositeCanvas.width, compositeCanvas.height);
        rendererRef.current.drawImage(compositeCanvas);
    }, [isOpen, data, localIdx, localCandidates, localCandidateBoxes, localSelectedIdx, getTrailLayer, getEditLayer]);

    // 캔버스 클릭 핸들러
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!rendererRef.current || !data) return;
        const canvas = rendererRef.current.getCanvas();
        if (!canvas) return;

        const rawImgList = data.getRawImgList(0);
        const backgroundImage = rawImgList ? rawImgList[localIdx] : null;
        if (!backgroundImage) return;

        const rect = canvas.getBoundingClientRect();
        const canvasW = rect.width;
        const canvasH = rect.height;
        const imageW = backgroundImage.width;
        const imageH = backgroundImage.height;

        // 1. 캔버스 내 실제 이미지가 그려진 영역(contain 방식) 계산
        const canvasAR = canvasW / canvasH;
        const imageAR = imageW / imageH;

        let renderW, renderH, offsetXImg, offsetYImg;

        if (imageAR > canvasAR) {
            // 이미지 비율이 더 넓음 -> 좌우 꽉 차고 상하 레터박스 생성
            renderW = canvasW;
            renderH = canvasW / imageAR;
            offsetXImg = 0;
            offsetYImg = (canvasH - renderH) / 2;
        } else {
            // 이미지 비율이 더 좁음 -> 상하 꽉 차고 좌우 레터박스 생성
            renderH = canvasH;
            renderW = canvasH * imageAR;
            offsetYImg = 0;
            offsetXImg = (canvasW - renderW) / 2;
        }

        // 2. 클릭 위치 보정 (CSS 픽셀에서 레터박스 오프셋 제거)
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // 3. 배율 적용 (원본 이미지 크기 / 실제 렌더링된 크기)
        const multiplier = imageW / renderW;
        const rawX = (clickX - offsetXImg) * multiplier;
        const rawY = (clickY - offsetYImg) * multiplier;

        // 4. 클릭 판정 여유값: 화면상 10px 정도의 여백을 원본 해상도 기준으로 역산
        const toleranceX = 10 * multiplier;
        const toleranceY = 10 * multiplier;

        // 클릭된 좌표가 어떤 박스 안에 있는지 확인
        for (let i = 0; i < localCandidateBoxes.length; i++) {
            const box = localCandidateBoxes[i];
            const minX = box.x;
            const minY = box.y;
            const maxX = box.x + box.w;
            const maxY = box.y + box.h;

            const inRangeX = rawX >= minX - toleranceX && rawX <= maxX + toleranceX;
            const inRangeY = rawY >= minY - toleranceY && rawY <= maxY + toleranceY;

            if (inRangeX && inRangeY) {
                console.groupEnd();
                handleLocalCandidateSelect(i);
                return;
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('navigation.editTracking')}>
            <Div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>
                
                {/* 시각화 및 선택 영역 */}
                <Div style={{ 
                    position: 'relative', 
                    backgroundColor: '#000', 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    cursor: 'crosshair',
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }} onClick={handleCanvasClick}>
                    {!data ? (
                        <span style={{ color: 'white' }}>{t('common.loading')}</span>
                    ) : (
                        <CanvasRenderer 
                            ref={rendererRef} 
                            style={{ width: '100%', display: 'block' }} 
                        />
                    )}
                </Div>

                <Div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{t('navigation.frame')}:</span>
                        <InputNumber
                            value={localIdx}
                            min={0}
                            max={maxFrame}
                            onChange={(e: any) => setLocalIdx(Number(e.target.value))}
                            style={{ width: '70px' }}
                        />
                        <span>/ {maxFrame}</span>
                    </Div>
                    <Div style={{ display: 'flex', gap: '5px' }}>
                        <Button onClick={() => setLocalIdx(Math.max(0, localIdx - 1))}>{t('navigation.prev')}</Button>
                        
                        <Button 
                            style={{ 
                                backgroundColor: localSelectedIdx === -1 ? '#007bff' : '#eee',
                                color: localSelectedIdx === -1 ? 'white' : 'black'
                            }} 
                            onClick={() => handleLocalCandidateSelect(-1)}
                        >
                            {t('common.none')}
                        </Button>
                        <Button onClick={() => setLocalIdx(Math.min(maxFrame, localIdx + 1))}>{t('navigation.next')}</Button>
                    </Div>
                </Div>

                <Div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label>CONF ({t('settings.confThreshold', '임계값')}):</label>
                    <InputNumber
                        value={confValue}
                        step="0.01"
                        min="0" max="1"
                        onChange={onConfChange}
                        style={{ width: '80px' }}
                    />
                </Div>

            </Div>
        </Modal>
    );
};

export default TrackingEditorModal;