import React, { forwardRef, ReactNode, HTMLAttributes } from 'react';

interface BoxProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
}

const Box = forwardRef<HTMLDivElement, BoxProps>(({ children, style, ...props }, ref) => (
    <div 
        ref={ref} 
        style={{ ...styles.container, ...style }}
        {...props}
    >
        {children}
    </div>
));

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        backgroundColor: '#fff',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    },
};

Box.displayName = 'Box';
export default Box;