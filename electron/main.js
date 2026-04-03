const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const url = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../out/index.html')}`; // Fallback if using static export

  // For server-side Next.js, we need to wait for the server to be ready
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, we'll load the production server URL
    mainWindow.loadURL('http://localhost:3000'); 
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  if (isDev) {
    console.log('Development mode: Expecting Next.js server to be started externally.');
    return;
  }

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'database.db');
  
  // In production, we might need to copy the initial database if it doesn't exist
  // For now, we'll just set the env var
  const databaseUrl = `file:${dbPath}`;

  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = ['run', 'start'];
  
  nextProcess = spawn(command, args, {
    cwd: path.join(__dirname, '..'),
    shell: true,
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      DATABASE_URL: databaseUrl,
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'development-secret'
    }
  });

  nextProcess.stdout.on('data', (data) => {
    console.log(`Next.js: ${data}`);
  });

  nextProcess.stderr.on('data', (data) => {
    console.error(`Next.js Error: ${data}`);
  });
}

app.on('ready', () => {
  if (!isDev) {
    startNextServer();
  }
  
  // Wait for Next.js to start before creating the window
  const checkServer = setInterval(() => {
    fetch('http://localhost:3000')
      .then(() => {
        clearInterval(checkServer);
        createWindow();
      })
      .catch(() => {
        // Still waiting...
      });
  }, 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (nextProcess) nextProcess.kill();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
