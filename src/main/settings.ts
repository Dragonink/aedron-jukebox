import { Accelerator, app, BrowserWindow, dialog, globalShortcut } from "electron";
import { existsSync, mkdirSync, promises, writeFileSync } from "fs";
import { resolve } from "path";
import Settings from "../common/Settings";

/** Path to the data directory */
const PATH = resolve(app.getPath("userData"), "data");
export default PATH;
/** Path to the settings file */
const SETTINGS = resolve(PATH, "settings.json");
/** Default values for `Settings` */
const DEFAULTS = Object.freeze<Settings>({
    version: 1,
    keybinds: {
        modifier: "CmdOrCtrl+Alt",
        sound0: "num0",
        sound1: "num1",
        sound2: "num2",
        sound3: "num3",
        sound4: "num4",
        sound5: "num5",
        sound6: "num6",
        sound7: "num7",
        sound8: "num8",
        sound9: "num9",
        stop: "numdiv",
        nextSet: "PageDown",
        prevSet: "PageUp"
    }
});
/** Cache storage for settings */
let cache: null | {
    /** Cache storage */
    settings: Settings;
    /** Timestamp of latest cache */
    time: number;
} = null;

/** Get all settings */
export async function get(): Promise<Readonly<Settings>>;
/** Get a setting
 * @param setting Setting name
 * @returns Setting value
 */
export async function get<S extends keyof Settings>(setting: S): Promise<Settings[S]>;
export async function get<S extends keyof Settings>(setting?: S): Promise<Readonly<Settings> | Settings[S]> {
    if (cache === null || (await promises.lstat(SETTINGS)).mtimeMs > cache.time) {
        // Update `cache` if outdated
        cache = {
            settings: Object.freeze(JSON.parse(await promises.readFile(SETTINGS, "utf8"))),
            time: Date.now()
        };
    }
    return setting === undefined ? cache.settings : cache.settings[setting];
}
/** Set some settings
 * @param settings Settings to set
 * @returns `Promise` that resolves when the changes are saved
 */
export function set(settings: Partial<Settings>): Promise<void> {
    return promises.writeFile(SETTINGS, JSON.stringify(Object.assign({}, cache === null ? DEFAULTS : cache.settings, settings)), "utf8");
}
/** Reset the settings
 * @returns `Promise` that resolves when the changes are saved
 */
export function reset(): Promise<void> {
    return promises.writeFile(SETTINGS, JSON.stringify(DEFAULTS), "utf8");
}
/** Construct a function to append keybinds to `modifier`
 * @param modifier Modifier to be appended keybinds
 * @returns Function taking a keybind to append to `modifier`
 */
export function fullKeybind(modifier: Accelerator): (keybind: Accelerator) => Accelerator {
    return (keybind: Accelerator) => [modifier, keybind]
        .filter((kbd, _idx, _arr) => kbd !== "")
        .join("+");
}

// Create data directory if inexistent
mkdirSync(PATH, { recursive: true });
// Create settings file with default values if inexistent
if (!existsSync(SETTINGS)) writeFileSync(SETTINGS, JSON.stringify(DEFAULTS), "utf8");
// Check initialization operations
get()
    .then(settings => {
        // Upgrade settings if outdated
        if (typeof settings.version !== "number" || settings.version < DEFAULTS.version) return reset()
            .then(() => {
                /** Upgrade settings
                 * @param old Old settings
                 * @param defaults New default settings
                 * @returns Upgraded `old` with new `defaults`
                 */
                function upgrade<S>(old: any, defaults: S): S {
                    const upgraded: Partial<S> = {};
                    for (const property in defaults) if (property in old) {
                        if (typeof defaults[property] === "object") upgraded[property] = upgrade(old[property], defaults[property]);
                        else upgraded[property] = old[property];
                    } else upgraded[property] = defaults[property];
                    return upgraded as S;
                }
                console.debug("Upgraded settings");
                return upgrade(settings, DEFAULTS);
            });
        else return settings;
    })
    .then(settings => {
        // Register global accelerators
        const notBound: string[] = [];
        const getFullKeybind = fullKeybind(settings.keybinds.modifier);
        for (let s = 0; s < 10; s++) if (!globalShortcut.register(getFullKeybind(settings.keybinds["sound" + s as keyof Settings["keybinds"]]), () => BrowserWindow.getAllWindows()[0].webContents.send("sounds:play", s))) notBound.push("sound" + s);
        if (!globalShortcut.register(getFullKeybind(settings.keybinds.stop), () => BrowserWindow.getAllWindows()[0].webContents.send("sounds:stop"))) notBound.push("stop");
        if (!globalShortcut.register(getFullKeybind(settings.keybinds.nextSet), () => BrowserWindow.getAllWindows()[0].webContents.send("sounds:sets:select", +1))) notBound.push("nextSet");
        if (!globalShortcut.register(getFullKeybind(settings.keybinds.prevSet), () => BrowserWindow.getAllWindows()[0].webContents.send("sounds:sets:select", -1))) notBound.push("prevSet");
        if (notBound.length > 0) {
            console.error("Could not bind the following accelerators:", notBound.join());
            dialog.showErrorBox("Could not bind the following accelerators", notBound.join());
        } else console.debug("Bound all accelerators");
    })
    .catch(error => {
        console.error(error);
        dialog.showErrorBox("Could not update settings", error.toString());
    });
// Create data directories if inexistent
Promise.all(["sets"]
    .map((dir, _idx, _arr) => {
        dir = resolve(PATH, dir);
        return existsSync(dir) ? undefined : promises.mkdir(dir, { recursive: true });
    })
    .filter(function (val, _idx, _arr): val is Promise<void> { return val !== undefined })
)
    .then(tasks => { if (tasks.length > 0) console.debug("Created data directories"); })
    .catch(error => {
        console.error(error);
        dialog.showErrorBox("Could not create directory", error.toString());
    });
