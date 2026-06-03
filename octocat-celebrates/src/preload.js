const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('octocat', {
  onGitEvent: (callback) => {
    ipcRenderer.on('git-event', (_event, payload) => callback(payload));
  },
  quit: () => ipcRenderer.send('quit-app')
});
