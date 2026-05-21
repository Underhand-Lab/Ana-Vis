import React, { forwardRef, ReactNode, HTMLAttributes } from 'react';
import vars from '../../variables';

interface WrapperProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
}

const Wrapper = forwardRef<HTMLDivElement, WrapperProps>(({ children, style, ...props }, ref) => (
    <div 
        ref={ref} 
        style={{ 
            ...styles.wrapper, 
            backgroundColor: vars.background,
            color: vars.text,
            ...style 
        }}
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
        alignItems: 'center',
        margin: 0,
        textAlign: 'center',
        lineHeight: '180%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        maxHeight: '100vh',
        wordBreak: 'keep-all',
        // iOS Notch 및 Android 시스템 바 대응
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
    },
};

Wrapper.displayName = 'Wrapper';
export default Wrapper;