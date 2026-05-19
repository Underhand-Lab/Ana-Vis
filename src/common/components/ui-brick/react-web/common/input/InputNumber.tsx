import React, { forwardRef, InputHTMLAttributes } from 'react';
import vars from '../../../Variables';

interface InputNumberProps extends InputHTMLAttributes<HTMLInputElement> {}

const InputNumber = forwardRef<HTMLInputElement, InputNumberProps>(({ style, ...props }, ref) => (
    <input 
        ref={ref} 
        type="number" 
        style={{ ...styles.input, ...style }}
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
    },
};

InputNumber.displayName = 'Input';
export default InputNumber;