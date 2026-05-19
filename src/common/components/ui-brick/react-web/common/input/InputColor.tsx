import React, { useState, useEffect, useCallback, FC, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RgbaColorPicker } from "react-colorful";
import Div from '../Div';

interface RgbaColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * RGBA 문자열 파싱 및 변환 헬퍼
 * Hex 지원 (#RRGGBB) 및 RGBA 정규식 개선 (공백 유무에 유연하게 대응)
 */
const parseRgba = (rgbaStr: string | null | undefined): RgbaColor => {
    if (!rgbaStr) return { r: 255, g: 255, b: 255, a: 1 };

    // Hex 지원 (#RRGGBB)
    if (rgbaStr.startsWith('#')) {
        const r = parseInt(rgbaStr.slice(1, 3), 16);
        const g = parseInt(rgbaStr.slice(3, 5), 16);
        const b = parseInt(rgbaStr.slice(5, 7), 16);
        return { r, g, b, a: 1 };
    }

    // RGBA 정규식 개선 (공백 유무에 유연하게 대응)
    const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return { r: 255, g: 255, b: 255, a: 1 };

    return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] ? parseFloat(match[4]) : 1
    };
};

/**
 * 색상 선택기 컴포넌트
 * @param {string} label - 색상 항목의 라벨
 * @param {string} value - 현재 RGBA 색상 문자열 (예: "rgba(255,0,0,1)")
 * @param {function} onChange - 색상 변경 시 호출될 콜백 함수 (newRgbaStr) => void
 */
interface InputColorProps {
    label?: string;
    value: string;
    onChange: (newRgbaStr: string) => void;
}

const InputColor: FC<InputColorProps> = ({ label, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

    // 로컬 상태를 두어 드래그 시 즉각적인 반응을 보장합니다.
    const [localColor, setLocalColor] = useState(value);

    const toggleOpen = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const pickerWidth = 210; // RgbaColorPicker의 기본 너비(200px) + 여백
            const viewportWidth = window.innerWidth;
            
            let left = rect.left + window.scrollX;

            // 피커가 화면 오른쪽 끝을 벗어나는지 확인하여 위치 조정
            if (rect.left + pickerWidth > viewportWidth) {
                left = Math.max(10, viewportWidth - pickerWidth - 10) + window.scrollX;
            }

            setPickerPos({
                top: rect.bottom + window.scrollY + 5,
                left: left
            });
        }
        setIsOpen(!isOpen);
    };

    // 외부에서 들어오는 value가 바뀌면 로컬 상태 동기화
    useEffect(() => {
        if (value && value !== localColor) {
            setLocalColor(value);
        }
    }, [value]);

    const handleColorChange = useCallback((color: RgbaColor) => {
        const newRgba = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
        setLocalColor(newRgba);
        onChange(newRgba);
    }, [onChange]);

    return (
        <Div style={{ marginBottom: '10px' }}>
            <Div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Div 
                    ref={triggerRef}
                    onClick={toggleOpen} 
                    style={{ width: '36px', height: '36px', borderRadius: '4px', border: '2px solid white', boxShadow: '0 0 0 1px #ddd', background: localColor, cursor: 'pointer' }} 
                />
                {label && <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{label}</span>}
            </Div>
            {isOpen && createPortal(
                <Div style={{ position: 'absolute', zIndex: 10000, top: pickerPos.top, left: pickerPos.left }}>
                    <Div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setIsOpen(false)} />
                    <RgbaColorPicker color={parseRgba(localColor)} onChange={handleColorChange} />
                </Div>,
                document.body
            )}
        </Div>
    );
};

export default InputColor;