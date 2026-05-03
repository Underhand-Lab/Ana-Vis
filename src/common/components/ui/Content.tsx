import React, { forwardRef, ReactNode, HTMLAttributes } from 'react';

interface ContentProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
}

const Content = forwardRef<HTMLDivElement, ContentProps>(({ children, style, ...props }, ref) => (
    <div 
        ref={ref} 
        style={{ ...styles.container, ...style }}
        {...props}
    >
        {children}
    </div>
));

const styles: { [key: string]: React.CSSProperties } = {
    wrapper: {
        width: '100%',
        height: '100%',
        fontFamily: "'KBO-Dia-Gothic_medium', Arial, sans-serif",
        backgroundColor: '#f0f2f5',
        color: '#333',
        alignItems: 'center',
        margin: 0,
        textAlign: 'center',
        lineHeight: '180%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        maxHeight: '100vh',
        wordBreak: 'keep-all',
    },
};

Content.displayName = 'Content';
export default Content;