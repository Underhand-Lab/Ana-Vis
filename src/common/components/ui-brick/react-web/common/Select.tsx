import React, { forwardRef, ReactNode, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    // label과 value를 가진 객체 배열이거나, 단순 문자열 배열 모두 허용
    options?: (string | { label: string; value: string | number })[];
    children?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ options, children, style, ...props }, ref) => (
    <select ref={ref} style={{ ...styles.select, ...style }} {...props}>
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
    select: {},
};

Select.displayName = 'Select';
export default Select;