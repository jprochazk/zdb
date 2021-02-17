import type { BrowserWindow } from "electron";
import appConfig from "electron-settings";

export interface WindowState {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function get(title: string): WindowState {
    if (appConfig.hasSync(`$WSTATE.${title}`)) {
        return appConfig.getSync(`$WSTATE.${title}`) as any;
    }
    return {} as any;
}

export function save(win: BrowserWindow) {
    appConfig.setSync(`$WSTATE.${win.title}`, win.getBounds() as any);
}