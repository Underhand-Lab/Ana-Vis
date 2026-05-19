import React, { forwardRef, ReactNode, HTMLAttributes } from 'react';

interface ContentProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
}

const Content = forwardRef<HTMLDivElement, ContentProps>(({ children, style, ...props }, ref) => (
    <div 
        ref={ref} 
        style={{ ...styles.content, ...style }}
        {...props}
    >
        {children}
    </div>
));

const styles: { [key: string]: React.CSSProperties } = {
    content: {
        flex: 1,
        width: '100%',
        overflowY: 'auto',
    }
};

Content.displayName = 'Content';
export default Content;