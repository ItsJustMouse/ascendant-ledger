'use strict';

const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { findFreePort, waitForHealth, compareVersions, isValidSQLiteHeader } = require('./lib/runtime.cjs');

const APP_NAME = 'Ascendant Ledger';
const CREATOR = 'NullBot';
const COPYRIGHT = 'Created by NullBot | Copyright 2026';
const REPOSITORY_URL = 'https://github.com/ItsJustMouse/ascendant-ledger';
const RELEASES_URL = `${REPOSITORY_URL}/releases`;
const ISSUES_URL = `${REPOSITORY_URL}/issues/new/choose`;
const UPDATE_API = 'https://api.github.com/repos/ItsJustMouse/ascendant-ledger/releases/latest';

let mainWindow = null;
let backend = null;
let backendPort = null;
let backendBaseUrl = null;
let quitting = false;
let backendStarting = false;
let backendStopExpected = false;

function dataDir() {
  return path.join(app.getPath('userData'), 'data');
}

function databasePath() {
  return path.join(dataDir(), 'ascendant-ledger.db');
}

function logFilePath() {
  return path.join(app.getPath('logs'), 'ascendant-ledger-backend.log');
}

function serverRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.resolve(__dirname, '.server-runtime');
}

function ensureAppDirectories() {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.mkdirSync(app.getPath('logs'), { recursive: true });
}

function appendBackendLog(source, chunk) {
  const line = `[${new Date().toISOString()}] [${source}] ${String(chunk)}`;
  try {
    fs.appendFileSync(logFilePath(), line);
  } catch {
    // Logging must never prevent the ledger from starting.
  }
}

async function startBackend() {
  if (backendStarting) return;
  backendStarting = true;
  try {
    if (backend && !backend.killed) return;

    ensureAppDirectories();
    backendPort = await findFreePort('127.0.0.1');
    backendBaseUrl = `http://127.0.0.1:${backendPort}`;

    const root = serverRoot();
    const entry = path.join(root, 'dist', 'index.js');
    if (!fs.existsSync(entry)) {
      throw new Error(`Desktop server runtime is missing: ${entry}`);
    }

    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(backendPort),
      DATA_DIR: dataDir(),
      DATABASE_FILENAME: 'ascendant-ledger.db',
      AUTH_ENABLED: 'false',
      TRUST_PROXY: 'false',
      DESKTOP_MODE: 'true',
      LOG_LEVEL: 'info',
    };

    backend = spawn(process.execPath, [entry], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    backend.stdout?.on('data', (chunk) => appendBackendLog('stdout', chunk));
    backend.stderr?.on('data', (chunk) => appendBackendLog('stderr', chunk));
    backend.once('error', (error) => appendBackendLog('spawn-error', `${error.stack || error}\n`));
    backend.once('exit', (code, signal) => {
      appendBackendLog('exit', `code=${code} signal=${signal}\n`);
      const expectedStop = backendStopExpected;
      backendStopExpected = false;
      backend = null;
      if (!expectedStop && !quitting && mainWindow && !mainWindow.isDestroyed()) {
        void dialog.showMessageBox(mainWindow, {
          type: 'error',
          title: `${APP_NAME} stopped`,
          message: 'The local Ascendant Ledger service stopped unexpectedly.',
          detail: `Open the log folder for details.\n\n${logFilePath()}`,
          buttons: ['Open Logs Folder', 'Close'],
        }).then((result) => {
          if (result.response === 0) shell.showItemInFolder(logFilePath());
        });
      }
    });

    await waitForHealth(`${backendBaseUrl}/api/health`, { timeoutMs: 45_000 });
  } finally {
    backendStarting = false;
  }
}

function stopBackend() {
  return new Promise((resolve) => {
    if (!backend || backend.killed) return resolve();
    backendStopExpected = true;
    const processToStop = backend;
    const timer = setTimeout(() => {
      try { processToStop.kill('SIGKILL'); } catch {}
      resolve();
    }, 5_000);
    processToStop.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      processToStop.kill('SIGTERM');
    } catch {
      backendStopExpected = false;
      clearTimeout(timer);
      resolve();
    }
  });
}

function allowedLocalUrl(url) {
  if (!backendBaseUrl) return false;
  try {
    const parsed = new URL(url);
    const base = new URL(backendBaseUrl);
    return parsed.protocol === base.protocol && parsed.hostname === base.hostname && parsed.port === base.port;
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1050,
    minHeight: 680,
    backgroundColor: '#0b1116',
    title: APP_NAME,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged,
      webviewTag: false,
      allowRunningInsecureContent: false,
    },
  });

  // The renderer never needs camera, microphone, geolocation, notifications,
  // MIDI, USB, serial, or other device permissions. Deny them by default.
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  // Harden the embedded web UI. Inline styles are retained because the existing
  // dashboard generates a small amount of presentation markup dynamically.
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    if (!allowedLocalUrl(details.url)) return callback({ responseHeaders: details.responseHeaders });
    const headers = { ...details.responseHeaders };
    headers['Content-Security-Policy'] = ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'"];
    callback({ responseHeaders: headers });
  });

  mainWindow.loadFile(path.join(__dirname, 'splash.html'));
  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Keep all application navigation in the hardened main window.
    // Never create renderer-controlled child windows with different security settings.
    if (allowedLocalUrl(url)) void mainWindow.loadURL(url);
    else if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!allowedLocalUrl(url) && !url.startsWith('file:')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

async function loadLedger(route = '') {
  await startBackend();
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  const suffix = route ? `#/${route}` : '';
  await mainWindow.loadURL(`${backendBaseUrl}/${suffix}`);
}

async function backupDatabase() {
  if (!mainWindow || !backendBaseUrl) return;
  try {
    const response = await fetch(`${backendBaseUrl}/api/backup`);
    if (!response.ok) throw new Error(`Backup request returned HTTP ${response.status}.`);
    const disposition = response.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const defaultName = match?.[1] || `ascendant-ledger-backup-${new Date().toISOString().slice(0, 10)}.db`;
    const selected = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Ascendant Ledger Backup',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });
    if (selected.canceled || !selected.filePath) return;
    const bytes = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(selected.filePath, bytes);
    await dialog.showMessageBox(mainWindow, {
      type: 'info', title: 'Backup complete', message: 'Your Ascendant Ledger backup was saved.', detail: selected.filePath,
    });
  } catch (error) {
    await dialog.showMessageBox(mainWindow, { type: 'error', title: 'Backup failed', message: 'Could not create the backup.', detail: error.message });
  }
}

async function restoreDatabase() {
  if (!mainWindow) return;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore Ascendant Ledger Backup',
    properties: ['openFile'],
    filters: [{ name: 'Ascendant Ledger / SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
  });
  if (result.canceled || !result.filePaths[0]) return;
  const source = result.filePaths[0];
  const header = Buffer.alloc(16);
  const fd = fs.openSync(source, 'r');
  try { fs.readSync(fd, header, 0, 16, 0); } finally { fs.closeSync(fd); }
  if (!isValidSQLiteHeader(header)) {
    await dialog.showMessageBox(mainWindow, { type: 'error', title: 'Invalid backup', message: 'That file is not a valid SQLite database.' });
    return;
  }

  const confirm = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Restore backup?',
    message: 'This will replace the current Ascendant Ledger database.',
    detail: 'A safety copy of your current database will be created first. Both Realms will be replaced by the selected backup.',
    buttons: ['Cancel', 'Restore Backup'],
    defaultId: 0,
    cancelId: 0,
  });
  if (confirm.response !== 1) return;

  let safetyPath = null;
  try {
    // Create a snapshot-consistent safety backup while SQLite is still running.
    // Copying the live .db file directly can miss data that is still in the WAL.
    let safetyBytes = null;
    if (backendBaseUrl) {
      const safetyResponse = await fetch(`${backendBaseUrl}/api/backup`);
      if (!safetyResponse.ok) throw new Error(`Could not create pre-restore safety backup (HTTP ${safetyResponse.status}).`);
      safetyBytes = Buffer.from(await safetyResponse.arrayBuffer());
    }

    await stopBackend();
    ensureAppDirectories();
    const current = databasePath();
    if (safetyBytes) {
      safetyPath = path.join(dataDir(), `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
      fs.writeFileSync(safetyPath, safetyBytes);
    }
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.rmSync(`${current}${suffix}`, { force: true }); } catch {}
    }
    fs.copyFileSync(source, current);
    await startBackend();
    await mainWindow.loadURL(`${backendBaseUrl}/`);
    await dialog.showMessageBox(mainWindow, { type: 'info', title: 'Restore complete', message: 'Your Ascendant Ledger backup was restored successfully.', detail: safetyPath ? `A safety copy of the previous database was kept at:\n${safetyPath}` : '' });
  } catch (error) {
    // If the replacement failed after the backend was stopped, put the safety
    // snapshot back automatically so a failed restore cannot strand the user.
    try {
      if (safetyPath && fs.existsSync(safetyPath)) {
        const current = databasePath();
        for (const suffix of ['', '-wal', '-shm']) {
          try { fs.rmSync(`${current}${suffix}`, { force: true }); } catch {}
        }
        fs.copyFileSync(safetyPath, current);
      }
      if (!backend) await startBackend();
      if (backendBaseUrl && mainWindow && !mainWindow.isDestroyed()) await mainWindow.loadURL(`${backendBaseUrl}/`);
    } catch (rollbackError) {
      appendBackendLog('restore-rollback-error', `${rollbackError.stack || rollbackError}\n`);
    }
    await dialog.showMessageBox(mainWindow, { type: 'error', title: 'Restore failed', message: 'The backup could not be restored. Ascendant Ledger attempted to restore your previous database automatically.', detail: error.message });
  }

}

async function checkForUpdates({ silent = false } = {}) {
  if (!mainWindow) return;
  try {
    const response = await fetch(UPDATE_API, { headers: { 'User-Agent': `Ascendant-Ledger-Desktop/${app.getVersion()}` } });
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`);
    const release = await response.json();
    const latest = String(release.tag_name || '').replace(/^v/i, '');
    const current = app.getVersion();
    if (latest && compareVersions(latest, current) > 0) {
      const answer = await dialog.showMessageBox(mainWindow, {
        type: 'info', title: 'Update available', message: `Ascendant Ledger ${latest} is available.`, detail: `You are running ${current}.`, buttons: ['Not Now', 'Open Download Page'], defaultId: 1,
      });
      if (answer.response === 1) void shell.openExternal(release.html_url || RELEASES_URL);
    } else if (!silent) {
      await dialog.showMessageBox(mainWindow, { type: 'info', title: 'Ascendant Ledger is up to date', message: `You are running the latest version (${current}).` });
    }
  } catch (error) {
    if (!silent) await dialog.showMessageBox(mainWindow, { type: 'warning', title: 'Update check failed', message: 'Could not check GitHub for a newer release.', detail: error.message });
  }
}

function buildMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: APP_NAME,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: COPYRIGHT, enabled: false },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Import CSV…', accelerator: 'CmdOrCtrl+I', click: () => void loadLedger('import') },
        { type: 'separator' },
        { label: 'Backup Database…', accelerator: 'CmdOrCtrl+Shift+B', click: () => void backupDatabase() },
        { label: 'Restore Backup…', click: () => void restoreDatabase() },
        { label: 'Open Data Folder', click: () => void shell.openPath(dataDir()) },
        { label: 'Open Logs Folder', click: () => void shell.openPath(app.getPath('logs')) },
        ...(process.platform === 'darwin' ? [] : [{ type: 'separator' }, { role: 'quit' }]),
      ],
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    {
      label: 'Help',
      submenu: [
        { label: 'Check for Updates…', click: () => void checkForUpdates() },
        { label: 'GitHub Repository', click: () => void shell.openExternal(REPOSITORY_URL) },
        { label: 'Report a Bug', click: () => void shell.openExternal(ISSUES_URL) },
        { type: 'separator' },
        { label: `About ${APP_NAME}`, click: async () => {
          if (!mainWindow) return;
          await dialog.showMessageBox(mainWindow, {
            type: 'info', title: `About ${APP_NAME}`,
            message: `${APP_NAME} ${app.getVersion()}`,
            detail: `Self-hosted financial dashboard and CSV accounting tool for Sim Companies.\n\n${COPYRIGHT}\n\nOpen source: ${REPOSITORY_URL}`,
          });
        } },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.setName(APP_NAME);
if (process.platform === 'win32') app.setAppUserModelId('com.nullbot.ascendantledger');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    ensureAppDirectories();
    buildMenu();
    createWindow();
    try {
      await loadLedger();
      setTimeout(() => void checkForUpdates({ silent: true }), 4_000);
    } catch (error) {
      appendBackendLog('startup-error', `${error.stack || error}\n`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        const result = await dialog.showMessageBox(mainWindow, {
          type: 'error', title: 'Ascendant Ledger could not start', message: 'The local database service could not be started.',
          detail: `${error.message}\n\nLogs: ${logFilePath()}`,
          buttons: ['Open Logs Folder', 'Quit'],
          defaultId: 0,
        });
        if (result.response === 0) shell.showItemInFolder(logFilePath());
        app.quit();
      }
    }
  });

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      void loadLedger();
      return;
    }

    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  });

  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', (event) => {
    if (backend && !backend.killed) {
      event.preventDefault();
      void stopBackend().finally(() => app.exit(0));
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
