import { app, BrowserWindow, globalShortcut } from 'electron';
import url from 'url';
import path from 'path';
import updateApp from './updater';

function getAssetURL(asset: string): string {
    if (process.env.NODE_ENV === "production") {
        return url.format({
            pathname: path.join(__dirname, asset),
            protocol: 'file',
            slashes: true,
        });
    } else {
        return new URL(asset, `http://localhost:${process.env.SNOWPACK_PORT}/`).toString();
    }
}

let mainWindow: BrowserWindow | null | undefined;

function createMainWindow(): BrowserWindow {
    const w = new BrowserWindow({
        title: process.env.npm_package_name,
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
        }
    });
    w.maximizable = false;

    if (process.env.MODE !== 'production') {
        w.webContents.openDevTools();
    }

    w.setMenu(null);

    w.loadURL(getAssetURL('index.html'));

    w.on('closed', (): void => {
        mainWindow = null;
    });

    w.webContents.on('devtools-opened', (): void => {
        w.focus();
        setImmediate((): void => {
            w.focus();
        });
    });

    return w;
}

; (async function () {

    const instanceLock = app.requestSingleInstanceLock();
    if (!instanceLock) {
        app.quit();
    } else {
        // quit application when all windows are closed
        app.on('window-all-closed', (): void => {
            // on macOS it is common for applications to stay open until the user explicitly quits
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', (): void => {
            // on macOS it is common to re-create a window even after all windows have been closed
            if (mainWindow === null) {
                mainWindow = createMainWindow();
            }
        });

        // create main BrowserWindow when electron is ready
        app.on('ready', (): void => {
            mainWindow = createMainWindow();

            globalShortcut.register("CommandOrControl+Shift+I", () => {
                mainWindow?.webContents.openDevTools();
            });
        });

        app.on('before-quit', () => {
            globalShortcut.unregisterAll();
        })
    }
})();
