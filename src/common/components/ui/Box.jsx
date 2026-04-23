import React, { forwardRef } from 'react';

const Box = forwardRef(({ children, style, ...props }, ref) => (
    <div 
        ref={ref} 
        style={{ ...styles.container, ...style }}
        {...props}
    >
        {children}
    </div>
));

const styles = {
    container: {
        backgroundColor: '#fff',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    },
};

Box.displayName = 'Box';
export default Box;