const { app, BrowserWindow, BrowserView, ipcMain, session, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Optimize resource usage
app.commandLine.appendSwitch('disable-features', 'TranslateUI');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-translate');
app.commandLine.appendSwitch('metrics-recording-only');
app.commandLine.appendSwitch('no-first-run');
app.commandLine.appendSwitch('safebrowsing-disable-auto-update');
// Optional: uncomment for even lower RAM (may reduce performance on some systems)
// app.disableHardwareAcceleration();

const store = new Store({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    homepage: 'https://duckduckgo.com',
    theme: 'system',
    startMaximized: false,
    enableBitwarden: true,
    customCSS: '',
    userAgent: '',
    clearOnExit: false
  }
});

let mainWindow = null;
let browserView = null;
let currentUrl = store.get('homepage');

function createWindow() {
  const bounds = store.get('windowBounds');
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 400,
    minHeight: 300,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    title: 'Minimal Browser',
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true
  });

  // Persistent session for data saving (cookies, storage, cache)
  const ses = session.fromPartition('persist:main');

  browserView = new BrowserView({
    webPreferences: {
      session: ses,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });

  mainWindow.setBrowserView(browserView);
  updateBrowserViewBounds();

  // Load homepage
  browserView.webContents.loadURL(currentUrl);

  // Load UI
  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    if (store.get('startMaximized')) {
      mainWindow.maximize();
    }
    mainWindow.show();
  });

  // Save bounds on resize/move
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });
  mainWindow.on('move', () => {
    if (!mainWindow.isMaximized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  // Navigation events
  browserView.webContents.on('did-navigate', (e, url) => {
    currentUrl = url;
    mainWindow.webContents.send('url-changed', url);
  });
  browserView.webContents.on('did-navigate-in-page', (e, url) => {
    currentUrl = url;
    mainWindow.webContents.send('url-changed', url);
  });
  browserView.webContents.on('page-title-updated', (e, title) => {
    mainWindow.setTitle(title + ' - Minimal Browser');
    mainWindow.webContents.send('title-changed', title);
  });
  browserView.webContents.on('did-start-loading', () => {
    mainWindow.webContents.send('loading', true);
  });
  browserView.webContents.on('did-stop-loading', () => {
    mainWindow.webContents.send('loading', false);
  });

  // Open external links in default browser optionally, or same view
  browserView.webContents.setWindowOpenHandler(({ url }) => {
    browserView.webContents.loadURL(url);
    return { action: 'deny' };
  });

  // Try to load Bitwarden if present
  loadBitwardenExtension(ses);

  createMenu();
}

function updateBrowserViewBounds() {
  if (!mainWindow || !browserView) return;
  const [width, height] = mainWindow.getContentSize();
  // Leave space for toolbar (~50px)
  browserView.setBounds({ x: 0, y: 50, width: width, height: height - 50 });
}

function loadBitwardenExtension(ses) {
  const extPath = path.join(__dirname, 'extensions', 'bitwarden');
  if (fs.existsSync(extPath)) {
    ses.loadExtension(extPath, { allowFileAccess: true })
      .then((ext) => {
        console.log('Bitwarden loaded:', ext.name);
      })
      .catch((err) => {
        console.warn('Failed to load Bitwarden:', err.message);
      });
  } else {
    console.log('Bitwarden extension not found in extensions/bitwarden. Place unpacked extension there to enable.');
  }
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('open-settings')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => browserView.webContents.reload()
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => browserView.webContents.reloadIgnoringCache()
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => {
            if (browserView.webContents.isDevToolsOpened()) {
              browserView.webContents.closeDevTools();
            } else {
              browserView.webContents.openDevTools({ mode: 'detach' });
            }
          }
        }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => {
            if (browserView.webContents.canGoBack()) browserView.webContents.goBack();
          }
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => {
            if (browserView.webContents.canGoForward()) browserView.webContents.goForward();
          }
        },
        {
          label: 'Home',
          accelerator: 'Alt+Home',
          click: () => browserView.webContents.loadURL(store.get('homepage'))
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Minimal Browser',
              message: 'Minimal Browser v1.0.0',
              detail: 'Lightweight optimized browser with Bitwarden support, flexible customization and data persistence.\n\nGitHub: https://github.com/kekih/minimal-browser'
            });
          }
        },
        {
          label: 'How to install Bitwarden',
          click: () => {
            shell.openExternal('https://github.com/kekih/minimal-browser#bitwarden');
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC handlers
ipcMain.handle('navigate', (e, url) => {
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
    url = 'https://' + url;
  }
  browserView.webContents.loadURL(url);
  return true;
});

ipcMain.handle('go-back', () => {
  if (browserView.webContents.canGoBack()) browserView.webContents.goBack();
});

ipcMain.handle('go-forward', () => {
  if (browserView.webContents.canGoForward()) browserView.webContents.goForward();
});

ipcMain.handle('reload', () => {
  browserView.webContents.reload();
});

ipcMain.handle('get-settings', () => {
  return store.store;
});

ipcMain.handle('save-settings', (e, settings) => {
  Object.keys(settings).forEach(key => {
    store.set(key, settings[key]);
  });
  // Apply some immediately
  if (settings.homepage) {
    // no immediate action
  }
  return true;
});

ipcMain.handle('get-url', () => currentUrl);

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (store.get('clearOnExit')) {
      session.fromPartition('persist:main').clearStorageData();
    }
    app.quit();
  }
});

app.on('browser-window-resize', () => {
  updateBrowserViewBounds();
});
