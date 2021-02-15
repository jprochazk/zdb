
import { fs, os, path, fsp, homedir, shell } from "./Node";

const cachedir = path.join(homedir, ".zdbcache");
if (!fs.existsSync(cachedir)) {
    fs.mkdirSync(cachedir);
}

export * as CMS from "./CMS";
export * as File from "./File";
export * as ISDS from "./ISDS";
export { fs, os, path, fsp, homedir, cachedir, shell };