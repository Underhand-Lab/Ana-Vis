import React from 'react';
import vars from '../../../Variables';

interface InputSliderProps {
    id?: string;
    min: number | string;
    max: number | string;
    step?: number | string;
    value: number;
    onChange: (value: number) => void;
    style?: React.CSSProperties;
    className?: string;
}

const InputSlider: React.FC<InputSliderProps> = ({
    id,
    min,
    max,
    step = 1,
    value,
    onChange,
    style,
    className,
}) => {
    return (
        <input
            type="range"
            id={id}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            style={{ accentColor: vars.primary, cursor: 'pointer', ...style }}
            className={className}
        />
    );
};

export default InputSlider;