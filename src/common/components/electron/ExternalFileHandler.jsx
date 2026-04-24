import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ElectronFileHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;

    const handleExternalFile = (_event, data) => {
      if (!data) return;
      
      let fileName = "";
      let filePath = "";
      let content = null;

      if (typeof data === 'string') {
        filePath = data;
        fileName = data.split(/[\\/]/).pop();
      } else {
        filePath = data.path || "";
        fileName = data.name || filePath.split(/[\\/]/).pop() || "";
        content = data.content;
      }

      if (!fileName) return;
      const ext = fileName.split('.').pop()?.toLowerCase();
      
      let file = null;
      if (content) {
        const blob = new Blob([content]);
        file = new File([blob], fileName);
      }

      const extensionMap = {
        cvp: '/pose',
        cvbl: '/track-ball',
        cvbt: '/track-bat'
      };

      const targetPath = extensionMap[ext];
      if (!targetPath) {
        console.warn(`Unknown extension: ${ext}`);
        return;
      }

      navigate(targetPath, { 
        state: { 
          externalFile: file, 
          filePath: filePath 
        }, 
        replace: true 
      });
    };

    window.electron.ipcRenderer.on('open-external-file', handleExternalFile);
    window.electron.ipcRenderer.on('open-associated-file', handleExternalFile);
    window.electron.ipcRenderer.send('request-initial-file');

    return () => {
      window.electron.ipcRenderer.removeAllListeners('open-external-file');
      window.electron.ipcRenderer.removeAllListeners('open-associated-file');
    };
  }, [navigate]);

  return null; // UI를 렌더링하지 않는 로직 전용 컴포넌트
};

export default ElectronFileHandler;