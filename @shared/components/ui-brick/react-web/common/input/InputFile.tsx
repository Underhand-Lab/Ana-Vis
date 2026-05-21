import React, { forwardRef, useState, InputHTMLAttributes, useRef, useImperativeHandle } from 'react';
import vars from '../../../variables';
import Button from '../Button';

interface InputFileProps extends InputHTMLAttributes<HTMLInputElement> {}

const InputFile = forwardRef<HTMLInputElement, InputFileProps>(({ style, onChange, ...props }, ref) => {
    const [fileName, setFileName] = useState('선택된 파일 없음');
    const inputRef = useRef<HTMLInputElement>(null);

    // 부모 컴포넌트에서 전달받은 ref를 실제 숨겨진 input 엘리먼트에 연결합니다.
    useImperativeHandle(ref, () => inputRef.current!);

    const handleInternalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileName(file ? file.name : '선택된 파일 없음');
        if (onChange) onChange(e);
    };

    // display: 'none'인 경우 (예: 다른 버튼을 통해 API로만 트리거할 때) 기존처럼 input만 반환합니다.
    if (style?.display === 'none') {
        return (
            <input 
                type="file" 
                ref={inputRef} 
                style={style} 
                onChange={handleInternalChange}
                {...props} 
            />
        );
    }

    return (
        <div style={{ ...styles.container, ...style }}>
            <input 
                type="file" 
                ref={inputRef} 
                style={styles.hiddenInput} 
                onChange={handleInternalChange}
                {...props}
            />
            <Button 
                type="button" 
                onClick={() => inputRef.current?.click()}
                style={{ margin: 0 }}
            >
                파일 선택
            </Button>
            <span style={styles.fileName}>
                {fileName}
            </span>
        </div>
    );
});

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: vars.font,
        fontSize: '14px',
        color: '#444',
        gap: '10px',
    },
    hiddenInput: {
        display: 'none',
    },
    fileName: {
        color: '#888',
        fontSize: '13px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '150px',
    }
};

InputFile.displayName = 'InputFile';
export default InputFile;