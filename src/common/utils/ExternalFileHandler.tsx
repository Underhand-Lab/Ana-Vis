import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface FileData {
  path?: string;
  name?: string;
  content?: any;
}

const ElectronFileHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;

    const handleExternalFile = (_event: any, data: string | FileData) => {
      if (!data) return;
      
      let fileName = "";
      let filePath = "";
      let content = null;

      if (typeof data === 'string') {
        filePath = data;
        fileName = data.split(/[\\/]/).pop() || "";
      } else {
        filePath = data.path || "";
        fileName = data.name || filePath.split(/[\\/]/).pop() || "";
        content = data.content;
      }

      if (!fileName) return;
      const ext = fileName.split('.').pop()?.toLowerCase();
      
      let file: File | null = null;
      if (content) {
        const blob = new Blob([content]);
        file = new File([blob], fileName);
      }

      const extensionMap: Record<string, string> = {
        cvp: '/pose',
        cvbl: '/track-ball',
        cvbt: '/track-bat'
      };

      const targetPath = ext ? extensionMap[ext] : null;
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

    electron.ipcRenderer.on('open-external-file', handleExternalFile);
    electron.ipcRenderer.on('open-associated-file', handleExternalFile);
    electron.ipcRenderer.send('request-initial-file');

    return () => {
      electron.ipcRenderer.removeAllListeners('open-external-file');
      electron.ipcRenderer.removeAllListeners('open-associated-file');
    };
  }, [navigate]);

  return null;
};

export default ElectronFileHandler;