
import { fsp } from "~/renderer/core/Node";
const CMS = window.require("@lapo/extractcms") as typeof import("@lapo/extractcms").default;

export async function extract(path: string): Promise<string> {
    return CMS.extract(await fsp.readFile(path));
}