import React, { forwardRef, ReactNode, HTMLAttributes } from 'react';

interface H3Props extends HTMLAttributes<HTMLHeadingElement> {
    children?: ReactNode;
}

const H3 = forwardRef<HTMLHeadingElement, H3Props>(({ children, style, ...props }, ref) => (
    <h1 
        ref={ref} 
        style={{ ...styles.text, ...style }} 
        {...props}
    >
        {children}
    </h1>
));

const styles: { [key: string]: React.CSSProperties } = {
    text: {
        fontSize: 20,
    },
};

H3.displayName = 'H3';

export default H3;