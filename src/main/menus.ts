import { app, dialog, Menu, MenuItemConstructorOptions } from "electron";
import AppMenuConfig from "../common/AppMenuConfig";
import icon from "../common/icons";
import Settings from "../common/Settings";
import { fullKeybind, get } from "./settings";

/** Generate app menu
 * @param config Configuration of the app menu
 * @returns `Promise` that resolves when the app menu is set
 */
export default function (config: Readonly<AppMenuConfig>) {
    const template: MenuItemConstructorOptions[] = [
        {
            id: "sounds",
            label: "&Sounds",
            submenu: []
        },
        {
            id: "devices",
            label: "&Devices",
            submenu: [
                {
                    label: "Reload",
                    click(_item, window, _event) {
                        return window!.webContents.send("devices:load");
                    }
                }
            ]
        },
        {
            id: "help",
            role: "help",
            submenu: app.isPackaged ? [
                { role: "about" }
            ] : [
                    { role: "toggleDevTools" },
                    { type: "separator" },
                    { role: "about" }
                ]
        }
    ];
    if (process.platform === "darwin") template.unshift({ role: "appMenu" });
    return get("keybinds")
        .then(keybinds => {
            const getFullKeybind = fullKeybind(keybinds.modifier);
            const menu: MenuItemConstructorOptions[] = [
                {
                    label: "Play sound",
                    submenu: []
                },
                {
                    label: "Stop sound",
                    accelerator: getFullKeybind(keybinds.stop),
                    click(_item, window, _event) {
                        return window!.webContents.send("sounds:stop");
                    },
                    enabled: !(typeof config.sounds !== "undefined" && config.sounds === false)
                },
                { type: "separator" },
                {
                    label: "Select previous set",
                    accelerator: getFullKeybind(keybinds.prevSet),
                    click(_item, window, _event) {
                        return window!.webContents.send("sounds:sets:select", -1);
                    }
                }, {
                    label: "Select next set",
                    accelerator: getFullKeybind(keybinds.nextSet),
                    click(_item, window, _event) {
                        return window!.webContents.send("sounds:sets:select", +1);
                    }
                }, {
                    label: "Manage sets",
                    submenu: [
                        {
                            label: "Reload",
                            click(_item, window, _event) {
                                return window!.webContents.send("sounds:sets:load");
                            }
                        },
                        { type: "separator" },
                        {
                            label: "Create new",
                            enabled: false
                        },
                        {
                            label: "Delete current",
                            enabled: false
                        },
                        {
                            label: "Rename current",
                            enabled: false
                        }
                    ]
                }
            ];
            for (let r = 0; r < 10; r++) (menu[0].submenu as MenuItemConstructorOptions[]).push({
                label: "Sound #" + r,
                accelerator: getFullKeybind(keybinds[("sound" + r) as keyof Settings["keybinds"]]),
                click(_item, window, _event) {
                    return window!.webContents.send("sounds:play", r);
                },
                enabled: !(typeof config.sounds !== "undefined" && (config.sounds === false || typeof config.sounds["sound" + r as keyof AppMenuConfig["sounds"]] !== "undefined"))
            });
            template[template.findIndex((item, _idx, _arr) => item.id === "sounds")].submenu = menu;
            return Menu.buildFromTemplate(template);
        })
        .then(menu => Menu.setApplicationMenu(menu))
        .catch(error => {
            console.error(error);
            dialog.showErrorBox("Could not load settings", error.toString());
        });
};

/** Context menu for the tray */
export const tray = Menu.buildFromTemplate([
    {
        label: app.getName(),
        icon,
        enabled: false
    },
    { type: "separator" },
    {
        label: "Quit",
        click(_menu, _window, _event) {
            return app.quit();
        }
    }
]);
