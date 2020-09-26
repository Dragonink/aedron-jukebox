import { contextBridge, ipcRenderer } from "electron";
import { promises } from "fs";
import { basename, resolve } from "path";
import AppMenuConfig from "../common/AppMenuConfig";

const API = {
    /** Functions to setup IPC */
    ipc: {
        /** Setup the listener for the `sounds:play` channel
         * @param listener Listener taking the sound number to play
         */
        sounds_play(listener: (sound: number) => string) {
            ipcRenderer.on("sounds:play", (_event, sound: number) => {
                const playing = listener(sound);
                if (playing !== "") console.debug("Playing sound \"%s\"", playing);
            });
        },
        /** Setup the listener for the `sounds:stop` channel
         * @param listener Listener
         */
        sounds_stop(listener: () => void) {
            ipcRenderer.on("sounds:stop", _event => listener());
        },
        /** Setup the listener for the `sounds:sets:load` channel
         * @param listener Listener taking the loaded set files
         */
        sounds_sets_load(listener: (files: { name: string, content: string }[]) => void) {
            const CHANNEL = "sounds:sets:load";
            return ipcRenderer
                .on(CHANNEL, _event => {
                    console.debug("Loading sets...")
                    let path: string;
                    let sets: string[];
                    ipcRenderer.invoke("settings:path")
                        .then((dir: string) => path = resolve(dir, "sets"))
                        .then(path => promises.readdir(path))
                        .then(files => {
                            sets = files.map((file, _idx, _arr) => basename(file, ".txt"));
                            return Promise.allSettled(files
                                .map((file, _idx, _arr) => promises.lstat(resolve(path, file))
                                    .then(stats => stats.isFile() ? promises.readFile(resolve(path, file), "utf8") : Promise.reject())
                                )
                            );
                        })
                        .then(results => listener(results
                            .filter(function (result, _idx, _arr): result is PromiseFulfilledResult<string> { return result.status === "fulfilled"; })
                            .map((result, idx, _arr) => ({ name: sets[idx], content: result.value }))
                        ))
                        .then(() => console.debug("Loaded %i sets", sets.length))
                        .catch(error => {
                            console.error(error);
                            return ipcRenderer.send("dialog:error", "Could not load sets", error.toString());
                        });
                })
                .send("emit", CHANNEL);//NOTE: request event to be emitted
        },
        /** Setup the listener for the `sounds:sets:select` channel
         * @param listener Listener taking +/-1 (next/previous set)
         */
        sounds_sets_select(listener: (di: number) => void) {
            ipcRenderer.on("sounds:sets:select", (_event, di: number) => listener(di));
            return listener(0);//NOTE: initialize select
        },
        /** Setup the listener for the `devices:load` channel
         * @param listener Listener taking the list of audiooutput devices
         */
        devices_load(listener: (devices: MediaDeviceInfo[]) => number) {
            const CHANNEL = "devices:load";
            return ipcRenderer
                .on(CHANNEL, _event => {
                    console.debug("Listing audiooutput devices...");
                    navigator.mediaDevices.enumerateDevices()
                        .then(devices => devices
                            .filter((dev, _idx, _arr) => dev.kind === "audiooutput")
                            .map((device, _idx, _arr) => JSON.parse(JSON.stringify(device)))//FIXME when Electron contextBridge is fixed
                        )
                        .then(listener)
                        .then(found => console.debug("Found %i devices", found))
                        .catch(error => {
                            console.error(error);
                            return ipcRenderer.send("dialog:error", "Could not list devices", error.toString());
                        });
                })
                .send("emit", CHANNEL);//NOTE: request event to be emitted
        }
    },
    /** Functions to trigger dialogs */
    dialog: {
        /** Display an error dialog
         * @param title Title of the dialog
         * @param contents Contents of the dialog
         */
        error(title: string, content: string) {
            return ipcRenderer.send("dialog:error", title, content);
        }
    },
    /** Function to control the app menu */
    menu: {
        /** Reload the app menu
         * @param config Configuration of the reloaded app menu
         */
        reload(config: AppMenuConfig) {
            return ipcRenderer.send("menu:reload", config);
        }
    }
};
contextBridge.exposeInMainWorld("electron", API);
type ElectronWindow = typeof window & { electron: typeof API };
export default ElectronWindow;
