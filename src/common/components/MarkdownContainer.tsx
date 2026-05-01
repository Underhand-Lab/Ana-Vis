import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownContainerProps {
  file: string;
}

const MarkdownContainer: React.FC<MarkdownContainerProps> = ({ file }) => {
  const [content, setContent] = useState('');
  useEffect(() => {
    // public 폴더에 있는 .md 파일을 fetch로 읽어옵니다.
    fetch(file)
      .then((response) => {
        if (!response.ok) throw new Error('파일을 불러오지 못했습니다.');
        return response.text();
      })
      .then((text) => setContent(text))
      .catch((err) => console.error(err));
  }, [file]);

  return (
      <ReactMarkdown>{content}</ReactMarkdown>
  );
};

export default MarkdownContainer;