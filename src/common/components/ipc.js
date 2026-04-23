import { Menu, ipcMain } from 'electron';

/**
 * Renderer Process(Navigation.jsx)로부터 전달된 메뉴 정보를 바탕으로
 * Electron 네이티브 시스템 메뉴를 생성하고 이벤트를 관리합니다.
 */
export function setupNativeMenuIpc() {
  ipcMain.on('update-native-menu', (event, { features, fileActions, toolActions, currentPath }) => {
    const template = [
      // macOS의 경우 첫 번째 메뉴는 앱 이름 메뉴여야 함
      ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
      {
        label: '파일',
        submenu: [
          ...(fileActions && fileActions.length > 0 
            ? fileActions.map((item) => ({
                label: item.label,
                click: () => {
                  event.sender.send('menu-command', 'fileAction', item.index);
                }
              }))
            : [{ label: '사용 가능한 도구 없음', enabled: false }]),
          { type: 'separator' },
          { role: 'quit', label: '종료' }
        ]
      },
      {
        label: '분석',
        submenu: features.map((item) => ({
          label: item.label,
          type: 'checkbox',
          checked: currentPath === item.path,
          click: () => {
            event.sender.send('menu-command', 'navigate', item.path);
          }
        }))
      },
      {
        label: '도구',
        submenu: [
          ...(toolActions && toolActions.length > 0 
            ? toolActions.map((item) => ({
                label: item.label,
                click: () => {
                  event.sender.send('menu-command', 'toolAction', item.index);
                }
              }))
            : [{ label: '추가 가능한 도구 없음', enabled: false }])
        ]
      },
      {
        label: '보기',
        submenu: [
          { role: 'reload', label: '새로고침' },
          { role: 'toggleDevTools', label: '개발자 도구' },
          { type: 'separator' },
          { role: 'resetZoom', label: '실제 크기' },
          { role: 'zoomIn', label: '확대' },
          { role: 'zoomOut', label: '축소' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  });
}