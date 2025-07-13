const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let toolWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');
}

function createToolWindow() {
    toolWindow = new BrowserWindow({
        width: 200,
        height: 300,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    toolWindow.loadFile('tools.html');
}

let currentTool = "cursor";

function setHandlers() {
    ipcMain.on('change-tool', (event, tool) => {
        currentTool = tool;
        console.log("Set log to " + currentTool);

        mainWindow.webContents.send('on-tool-change', currentTool);
    });

    ipcMain.on('undo', () => {
        console.log("Undo");

        mainWindow.webContents.send('on-history-action', 'undo');
    });

    ipcMain.on('redo', () => {
        console.log("Redo");

        mainWindow.webContents.send('on-history-action', 'redo');
    });
}

app.whenReady().then(() => {
    setHandlers();
    createMainWindow();
    createToolWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
            createToolWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
