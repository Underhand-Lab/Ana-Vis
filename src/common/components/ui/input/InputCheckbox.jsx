import React, { forwardRef } from 'react';
import vars from '../Variables';

const InputCheckbox = forwardRef(({ label, style, ...props }, ref) => {
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