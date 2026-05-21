import React, { forwardRef, InputHTMLAttributes } from 'react';
import { vars } from '../../../variables';

interface InputNumberProps extends InputHTMLAttributes<HTMLInputElement> {}

const InputNumber = forwardRef<HTMLInputElement, InputNumberProps>(({ style, ...props }, ref) => (
    <input 
        ref={ref} 
        type="number" 
        style={{ ...styles.input, backgroundColor: vars.surface, color: vars.text, ...style }}
        {...props} 
    />
));

const styles: { [key: string]: React.CSSProperties } = {
    input: {
        display: 'block',
        fontFamily: vars.font,
        fontSize: '16px',
        width: '100%',
        minWidth: 0,
        cursor: 'pointer',
        flex: 1,
        border: 'none',
        borderRadius: '10px',
        padding: '6px 12px',
    },
};

InputNumber.displayName = 'Input';
export default InputNumber;