import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from "electron";
const path = require("node:path");
const fs = require("node:fs");
import { electronApp, optimizer, is } from "@electron-toolkit/utils";

// 창 ID와 파일 경로를 매핑하여 관리합니다.
const windowFileMap = new Map<number, string>();
// 앱이 준비되기 전에 열린 파일들을 보관합니다.
const pendingFiles: string[] = [];

// 1. macOS에서 파일 열기 이벤트 처리
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (app.isReady()) {
    createWindow(filePath);
  } else {
    pendingFiles.push(filePath);
  }
});

// 2. 파일을 읽어서 렌더러로 전송하는 함수
function sendFileToRenderer(win: BrowserWindow, filePath: string) {
  if (!win || win.isDestroyed() || !filePath) return;
  try {
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath); 
    win.webContents.send("open-external-file", {
      name: fileName,
      path: filePath,
      content: content // 렌더러에서 Uint8Array로 수신됨
    });
  } catch (err) {
    console.error("파일 읽기 실패:", err);
  }
}

function createWindow(filePath?: string): void {
  // Create the browser window.
  const preloadPath = path.join(__dirname, "../preload/index.mjs");
  const win = new BrowserWindow({
    width: 1200,
    height: 640,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000', // Navigation 배경색과 맞추면 좋습니다.
      symbolColor: '#74b1be',
      height: 38 // Navigation의 height와 맞춤
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public/favicon.ico'),
    ...(process.platform === "linux" ? {} : {}), //app-icon
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: true,
    },
  });

  // 창과 파일을 연결합니다.
  if (filePath) {
    windowFileMap.set(win.id, filePath);
  }

  win.on("ready-to-show", () => {
    win.show();
    if (filePath) {
      sendFileToRenderer(win, filePath);
    }
  });

  win.on("closed", () => {
    windowFileMap.delete(win.id);
  });

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

// 4. 렌더러(App.jsx)의 초기 파일 요청 응답
ipcMain.on("request-initial-file", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const filePath = windowFileMap.get(win.id);
  if (filePath) {
    sendFileToRenderer(win, filePath);
    // ✅ 파일을 한 번 전송한 후에는 맵에서 제거합니다.
    // 이로써 렌더러가 이후에 다른 분석으로 이동하거나 새로고침했을 때 
    // 이전의 파일 정보가 다시 전달되어 내비게이션을 방해하는 것을 막습니다.
    windowFileMap.delete(win.id);
  }
});

// 6. 파일 저장 대화상자 처리 (Safari/Firefox 제약 해결용)
ipcMain.handle('save-file-dialog', async (_event, { content, suggestedName }) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;

  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: '파일 저장 위치 선택',
    defaultPath: suggestedName,
    buttonLabel: '저장',
  });

  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, Buffer.from(content));
      return { success: true, path: filePath };
    } catch (err) {
      console.error('파일 저장 중 오류:', err);
      throw err;
    }
  }
  return { success: false };
});

// 5. 렌더러로부터 메뉴 업데이트 요청 처리
ipcMain.on('update-native-menu', (event, menuData) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const { features, fileActions, toolActions, currentPath } = menuData;

  const fileSubmenu: any[] = [
    ...fileActions.map((action: any) => ({
      label: action.label,
      click: () => win.webContents.send('menu-command', 'fileAction', action.index)
    }))
  ];

  // toolActions가 있을 경우 파일 메뉴 내부에 구분선과 함께 추가
  if (toolActions && toolActions.length > 0) {
    fileSubmenu.push({ type: 'separator' });
    toolActions.forEach((action: any) => {
      fileSubmenu.push({
        label: action.label,
        click: () => win.webContents.send('menu-command', 'toolAction', action.index)
      });
    });
  }

  fileSubmenu.push({ type: 'separator' });
  fileSubmenu.push({ role: 'quit', label: '종료' });

  const template: any[] = [
    {
      label: '파일',
      submenu: fileSubmenu
    },
    {
      label: '보기',
      submenu: features.map((f: any) => ({
        label: f.label,
        type: 'radio',
        checked: currentPath === f.path,
        click: () => win.webContents.send('menu-command', 'navigate', f.path)
      }))
    },
    {
      label: '편집',
      role: 'editMenu'
    }
  ];

  const menu = Menu.buildFromTemplate(template);

  if (process.platform === 'darwin') {
    // macOS는 애플리케이션 전체 메뉴를 공유함
    Menu.setApplicationMenu(menu);
  } else {
    // Windows/Linux는 창별로 메뉴 설정 가능
    win.setMenu(menu);
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // 실행 인자(argv)에서 파일 경로들을 추출합니다. (Windows/Linux)
  const args = process.argv;
  const fileArgs = args.filter(arg => arg.endsWith('.cvp') || arg.endsWith('.cvbl') || arg.endsWith('.cvbt'));

  if (fileArgs.length > 0) {
    fileArgs.forEach(file => createWindow(file));
  } else if (pendingFiles.length > 0) {
    // macOS에서 준비 전 수신된 파일들 처리
    pendingFiles.forEach(file => createWindow(file));
    pendingFiles.length = 0;
  } else {
    // 전달된 파일이 없으면 빈 창 하나를 띄웁니다.
    createWindow();
  }

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});