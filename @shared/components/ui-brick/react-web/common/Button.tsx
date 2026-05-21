import React, { forwardRef, useState, ButtonHTMLAttributes, ReactNode } from 'react';
import vars from '../../variables'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children?: ReactNode;
    noHover?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ children, style, noHover, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button 
            ref={ref} 
            style={{ 
                ...styles.button, 
                fontFamily: vars.font,
                backgroundColor: vars.primary,
                ...(isHovered && !noHover ? styles.buttonHover : {}), // noHover가 아닐 때만 hover 스타일 추가
                ...style 
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            {...props}
        >
            {children}
        </button>
    );
});

const styles: { [key: string]: React.CSSProperties } = {
    button: {
        fontFamily: vars.font,
        fontSize: '15px',
        color: 'white',
        border: 'none',
        borderRadius: '10px', // Box.jsx와 일치
        padding: '8px 16px',
        margin: 0,
        boxShadow: '0 4px 6px rgba(103, 153, 250, 0.3)', // 브랜드 색상에 맞춘 부드러운 그림자
        cursor: 'pointer',
    },
    buttonHover: {
        backgroundColor: '#5a8be0', // hover 시 약간 더 어두운 색상
        boxShadow: '0 6px 10px rgba(103, 153, 250, 0.6)', // hover 시 그림자 강조
        transform: 'translateY(-3px)', // 약간 위로 올라가는 효과
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease',
    }
};

Button.displayName = 'Button';
export default Button;