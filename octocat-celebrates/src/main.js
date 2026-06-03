const { app, BrowserWindow, ipcMain } = require('electron');
const http = require('http');
const path = require('path');

const PORT = parseInt(process.env.OCTOCAT_PORT || '4242', 10);
const HOST = '127.0.0.1';

const VALID_EVENTS = new Set([
  'post-commit',
  'post-merge',
  'pre-push',
  'post-checkout',
  'post-rewrite'
]);

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 260,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Keep above full-screen apps and other windows.
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function sendEvent(type) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('git-event', { type });
  }
}

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/event') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1e4) req.destroy(); // guard against abuse
      });
      req.on('end', () => {
        let type = '';
        try {
          type = (JSON.parse(body || '{}').type || '').trim();
        } catch (_) {
          type = '';
        }
        if (VALID_EVENTS.has(type)) {
          console.log(`[octocat] event received: ${type}`);
          sendEvent(type);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, type }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'unknown event' }));
        }
      });
    } else if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.on('error', (err) => {
    console.error(`[octocat] server error: ${err.message}`);
  });

  server.listen(PORT, HOST, () => {
    console.log(`[octocat] listening on http://${HOST}:${PORT}`);
  });
}

ipcMain.on('quit-app', () => app.quit());

app.whenReady().then(() => {
  createWindow();
  startServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Keep running with no visible window chrome; only quit on explicit request.
app.on('window-all-closed', () => {
  app.quit();
});
