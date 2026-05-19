import React, { forwardRef, ReactNode, HTMLAttributes } from 'react';

interface FixedFooterProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
}

const FixedFooter = forwardRef<HTMLDivElement, FixedFooterProps>(({ children, style, ...props }, ref) => (
    <div 
        ref={ref} 
        style={{ ...styles.footer, ...style }} 
        {...props}
    >
        {children}
    </div>
));

const styles: { [key: string]: React.CSSProperties } = {
    footer: {
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        width: '100%',
        padding: '0 0 20px',
    },
};

FixedFooter.displayName = 'FixedFooter';
export default FixedFooter;