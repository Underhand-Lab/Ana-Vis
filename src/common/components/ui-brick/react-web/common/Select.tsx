import React, { forwardRef, ReactNode, SelectHTMLAttributes } from 'react';
import { vars } from '../../variables';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    // label과 value를 가진 객체 배열이거나, 단순 문자열 배열 모두 허용
    options?: (string | { label: string; value: string | number })[];
    children?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ options, children, style, ...props }, ref) => (
    <select ref={ref} style={{
        ...styles.select,
        backgroundColor: vars.surface,
        color: vars.text,
        ...style }}
        {...props}>
        {options ? (
            options.map((opt) => (
                typeof opt === 'string' ? (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ) : (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                )
            ))
        ) : (
            children
        )}
    </select>
));

const styles: { [key: string]: React.CSSProperties } = {
    select: {
        padding: '6px 12px',
        appearance: 'none',          // 네이티브 스타일 제약 제거
        WebkitAppearance: 'none',    // Safari 지원
        MozAppearance: 'none',       // Firefox 지원
        border: 'none',              // 배경색을 넣을 때 기본 테두리가 방해될 수 있음
        borderRadius: '10px',        // 디자인 통일성
        outline: 'none',
        fontSize: '16px',
    },
};

Select.displayName = 'Select';
export default Select;