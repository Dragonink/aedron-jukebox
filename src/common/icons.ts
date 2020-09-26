import { nativeImage } from "electron";
import { resolve } from "path";

/** Path to the app icon */
export const path = resolve("assets", "icon.png");//TODO: better icon(s)

/** App icon as `NativeImage` */
export default nativeImage.createFromPath(path);
