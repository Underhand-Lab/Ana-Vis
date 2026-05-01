import React, { forwardRef, InputHTMLAttributes } from 'react';
import vars from '../Variables';

interface InputCheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const InputCheckbox = forwardRef<HTMLInputElement, InputCheckboxProps>(({ label, style, ...props }, ref) => {
    const inputElement = (
        <input 
            ref={ref} 
            type="checkbox" 
            style={{ cursor: 'pointer', margin: 0 }}
            {...props} 
        />
    );

    if (!label) return inputElement;

    return (
        <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '12px', 
            fontFamily: vars.font,
            cursor: 'pointer', 
            ...style 
        }}>
            {inputElement}
            <span>{label}</span>
        </label>
    );
});

InputCheckbox.displayName = 'InputCheckbox';
export default InputCheckbox;