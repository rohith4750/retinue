const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;
let splashWindow;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 450,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'public/logo.png'),
  });

  splashWindow.loadFile('splash.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js'),
    },
    icon: path.join(__dirname, 'public/logo.png'),
  });

  // Remove the default menu
  Menu.setApplicationMenu(null);

  // Point to the live hosted site
  const startUrl = 'https://hoteltheretinue.in';

  // Restore Ctrl+R and Ctrl+Shift+R since default menu is removed
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'r') {
      if (input.shift) {
        mainWindow.webContents.reloadIgnoringCache();
      } else {
        mainWindow.webContents.reload();
      }
      event.preventDefault();
    }
    // Also allow Ctrl+Shift+I for DevTools if in dev mode
    if (isDev && input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.openDevTools();
      event.preventDefault();
    }
  });

  // Handle load failure
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Failed to load:', errorDescription);
    mainWindow.loadURL(`data:text/html,
      <body style="background:#0f172a; color:white; font-family:sans-serif; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh;">
        <h1>Connection Lost</h1>
        <p>Could not connect to ${startUrl}. Please check your internet connection.</p>
        <button onclick="location.reload()" style="padding:10px 20px; border-radius:5px; border:none; background:#fbbf24; cursor:pointer;">Retry</button>
      </body>
    `);
  });

  // Handle reloads to show splash indicator
  mainWindow.webContents.on('did-start-loading', () => {
    if (!splashWindow) {
      createSplash();
    }
  });

  // Once the app loads, hide splash and show main window
  mainWindow.webContents.on('did-finish-load', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.maximize();
    }
    mainWindow.focus();
  });

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initial setup
app.on('ready', () => {
  createSplash();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
