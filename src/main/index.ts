import { app, BrowserWindow, remote } from 'electron';
import url from 'url';
import path from 'path';
import updateApp from "./updater";

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
    const window = new BrowserWindow({
        title: process.env.npm_package_name,
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
        }
    });

    if (process.env.MODE !== 'production') {
        window.webContents.openDevTools();
    }

    window.setMenu(null);

    window.loadURL(getAssetURL('index.html'));

    window.on('closed', (): void => {
        mainWindow = null;
    });

    window.webContents.on('devtools-opened', (): void => {
        window.focus();
        setImmediate((): void => {
            window.focus();
        });
    });

    return window;
}

remote.globalShortcut.register("CommandOrControl+Shift+I", () => {
    remote.BrowserWindow.getFocusedWindow()?.webContents.openDevTools();
});

window.addEventListener("beforeunload", () => {
    remote.globalShortcut.unregisterAll();
});

(async function () {
    await app.whenReady();

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
        });

        await updateApp();
    }
})();
