import React, { forwardRef } from 'react';

const H3 = forwardRef(({ children, style, ...props }, ref) => (
    <h3 
        ref={ref} 
        style={{ ...styles.text, ...style }} 
        {...props}
    >
        {children}
    </h3>
));

const styles = {
    text: {
        paddingBottom: 0,
    },
};

H3.displayName = 'H3';

export default H3;