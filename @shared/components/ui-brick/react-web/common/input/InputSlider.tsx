import React, { useEffect, useRef, useState, useCallback } from 'react';
import vars from '../../../variables';

interface InputSliderProps {
    id?: string;
    min: number | string;
    max: number | string;
    step?: number | string;
    value: number;
    onChange: (value: number) => void;
    style?: React.CSSProperties;
    className?: string;
}

const InputSlider: React.FC<InputSliderProps> = ({
    id,
    min,
    max,
    step = 1,
    value,
    onChange,
    style,
    className,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const nMin = Number(min);
    const nMax = Number(max);
    const nStep = Number(step);
    const range = nMax - nMin;

    // 값에 따른 퍼센트 계산 (0 ~ 100)
    const percentage = range <= 0 ? 0 : ((value - nMin) / range) * 100;

    const updateValue = useCallback((clientX: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const pos = (clientX - rect.left) / rect.width;
        const clampedPos = Math.max(0, Math.min(1, pos));

        let newValue = nMin + clampedPos * range;

        if (nStep > 0) {
            // 스텝 단위로 반올림
            newValue = Math.round((newValue - nMin) / nStep) * nStep + nMin;
        }

        onChange(Math.min(nMax, Math.max(nMin, newValue)));
    }, [nMin, nMax, nStep, range, onChange]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); // 텍스트 선택 방지
        e.stopPropagation(); // 부모 요소(그리드 등)의 드래그 이벤트 전파 방지
        setIsDragging(true);
        updateValue(e.clientX);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        // touchAction: 'none'이 스타일 에 적용되어 있어 스크롤은 방지되나, 안전하게 전파 차단
        e.stopPropagation();
        setIsDragging(true);
        updateValue(e.touches[0].clientX);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => updateValue(e.clientX);
        const handleTouchMove = (e: TouchEvent) => updateValue(e.touches[0].clientX);
        const handleEnd = () => setIsDragging(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, updateValue]);

    return (
        <>
            {/* 드래그 중 다른 요소의 간섭을 차단하는 전역 투명 레이어 */}
            {isDragging && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 99999, // 최상단 배치
                        cursor: 'pointer',
                        backgroundColor: 'transparent'
                    }}
                />
            )}
            <div
                ref={containerRef}
                id={id}
                className={className}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    touchAction: 'none',
                    margin: '0 10px',
                    ...style
                }}
            >
                {/* 바탕 트랙 */}
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: vars.surface, // 현재 테마 텍스트 색상의 투명 버전
                }} />

                {/* 진행 상태 바 */}
                <div style={{
                    position: 'absolute',
                    width: `${percentage}%`,
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: vars.primary,
                }} />

                {/* 조절 핸들 (Thumb) */}
                <div style={{
                    position: 'absolute',
                    left: `${percentage}%`,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: vars.primary,
                    border: `2px solid ${vars.box}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: 'translateX(-50%)',
                    transition: isDragging ? 'none' : 'left 0.1s ease-out',
                }} />
            </div>
        </>
    );
};

export default InputSlider;