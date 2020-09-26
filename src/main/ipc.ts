import { dialog, ipcMain } from "electron";
import AppMenuConfig from "../common/AppMenuConfig";
import Settings from "../common/Settings";
import appMenu from "./menus";
import PATH, { get, reset, set } from "./settings";

ipcMain.on("emit", (event, channel: string) => event.sender.send(channel));

{//SECTION Dialog
    ipcMain.on("dialog:error", (_event, title: string, content: string) => dialog.showErrorBox(title, content));
}//!SECTION
{//SECTION Menu
    ipcMain.on("menu:reload", (_event, config: AppMenuConfig) => { appMenu(config); });
}//!SECTION
{//SECTION Settings
    ipcMain.handle("settings:path", _event => PATH);
    ipcMain.handle("settings:get", (_event, setting?: keyof Settings) => setting === undefined ? get() : get(setting));
    ipcMain.handle("settings:set", (_event, settings: Partial<Settings>) => set(settings));
    ipcMain.handle("settings:reset", _event => reset());
}//!SECTION
