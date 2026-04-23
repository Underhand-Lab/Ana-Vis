import React, { forwardRef } from 'react';

const Select = forwardRef(({ children, style, ...props }, ref) => (
    <select ref={ref} style={{ ...styles.select, ...style }} {...props}>
        {children}
    </select>
));

const styles = {
    select: {},
};

Select.displayName = 'Select';
export default Select;