// re-exports various Node.js APIs
// because require() is broken in Electron - you have to specify
// window.require(), which doesn't resolve types the same way as
// global require()

export const fs = window.require("fs") as typeof import("fs");
export const os = window.require("os") as typeof import("os");
export const path = window.require("path") as typeof import("path");
export const fsp = fs.promises;
export const homedir = os.homedir();
export const shell = window.require("electron").shell as typeof import("electron").shell;