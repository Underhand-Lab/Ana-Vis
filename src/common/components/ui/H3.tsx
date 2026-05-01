import React, { forwardRef, ReactNode, HTMLAttributes } from 'react';

interface H3Props extends HTMLAttributes<HTMLHeadingElement> {
    children?: ReactNode;
}

const H3 = forwardRef<HTMLHeadingElement, H3Props>(({ children, style, ...props }, ref) => (
    <h3 
        ref={ref} 
        style={{ ...styles.text, ...style }} 
        {...props}
    >
        {children}
    </h3>
));

const styles: { [key: string]: React.CSSProperties } = {
    text: {
        paddingBottom: 0,
    },
};

H3.displayName = 'H3';

export default H3;