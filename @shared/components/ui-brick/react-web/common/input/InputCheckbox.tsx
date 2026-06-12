import React, { forwardRef, InputHTMLAttributes } from 'react';
import vars from '../../../variables';

interface InputCheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const InputCheckbox = forwardRef<HTMLInputElement, InputCheckboxProps>(({ label, style, className = '', ...props }, ref) => {
    const inputElement = (
        <>
            <style>{`
                .ui-brick-toggle-checkbox {
                    appearance: none;
                    -webkit-appearance: none;
                    outline: none;
                    cursor: pointer;
                    width: 32px;
                    height: 18px;
                    background-color: ${vars.background};
                    border-radius: 9px;
                    position: relative;
                    transition: background-color 0.2s ease-in-out;
                    margin: 0;
                    border: 1px solid ${vars.surface};
                    box-sizing: border-box;
                    flex-shrink: 0;
                }
                .ui-brick-toggle-checkbox::after {
                    content: '';
                    position: absolute;
                    top: 1px;
                    left: 1px;
                    width: 14px;
                    height: 14px;
                    background-color: #fff;
                    border-radius: 50%;
                    transition: transform 0.2s ease-in-out;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .ui-brick-toggle-checkbox:checked {
                    background-color: ${vars.primary};
                    border-color: ${vars.primary};
                }
                .ui-brick-toggle-checkbox:checked::after {
                    transform: translateX(14px);
                }
            `}</style>
            <input
                ref={ref}
                type="checkbox"
                className={`ui-brick-toggle-checkbox ${className}`}
                style={!label ? style : undefined}
                {...props}
            />
        </>
    );

    if (!label) return inputElement;

    return (
        <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '16px',
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