import React, { forwardRef, InputHTMLAttributes } from 'react';
import vars from '../Variables';

interface InputFileProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const InputFile = forwardRef<HTMLInputElement, InputFileProps>(({ label, style, ...props }, ref) => {
    const inputElement = (
        <input 
            ref={ref} 
            type="file" 
            style={{ 
                fontFamily: vars.font, 
                cursor: 'pointer',
                ...style 
            }}
            {...props} 
        />
    );

    if (!label) return inputElement;

    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontFamily: vars.font }}>
            <span style={{ fontWeight: 'bold' }}>{label}</span>
            {inputElement}
        </label>
    );
});

InputFile.displayName = 'InputFile';
export default InputFile;