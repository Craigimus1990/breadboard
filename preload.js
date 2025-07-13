const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
    changeTool: (tool) => ipcRenderer.send('change-tool', tool),
    onToolChanged: (callback) => ipcRenderer.on('on-tool-change', (event, tool) => callback(tool)),
    onHistoryAction: (callback) => ipcRenderer.on('on-history-action', (event, action) => callback(action)),
    undo: () => ipcRenderer.send('undo'),
    redo: () => ipcRenderer.send('redo')
});