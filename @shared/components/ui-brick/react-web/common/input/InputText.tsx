import React, { forwardRef, InputHTMLAttributes } from 'react';
import { vars } from '../../../variables';

interface InputTextProps extends InputHTMLAttributes<HTMLInputElement> {}

const InputText = forwardRef<HTMLInputElement, InputTextProps>(({ style, ...props }, ref) => (
    <input 
        ref={ref} 
        type="text" 
        style={{ ...styles.input, fontFamily: vars.font, backgroundColor: vars.surface, color: vars.text, ...style }}
        {...props} 
    />
));

const styles: { [key: string]: React.CSSProperties } = {
    input: {
        display: 'block',
        fontSize: '16px',
        width: 'calc(100% - 24px)',
        minWidth: 0,
        cursor: 'pointer',
        flex: 1,
        border: 'none',
        borderRadius: '10px',
        padding: '6px 12px',
    },
};

InputText.displayName = 'Input';
export default InputText;