import React, { forwardRef } from 'react';
import vars from '../Variables';

const InputNumber = forwardRef(({ style, ...props }, ref) => (
    <input 
        ref={ref} 
        type="number" 
        style={{ ...styles.input, ...style }}
        {...props} 
    />
));

const styles = {
    input: {
        fontFamily: vars.font,
        fontSize: '16px',
    },
};

InputNumber.displayName = 'Input';
export default InputNumber;