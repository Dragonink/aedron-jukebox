import { app, BrowserWindow, dialog, globalShortcut, nativeTheme, Tray } from "electron";
import { resolve } from "path";
import icon, { path as iconPath } from "../common/icons";
import appMenu, { tray as trayMenu } from "./menus";

console.info("%s v%s", app.getName(), app.getVersion());
console.debug("Starting app...");
if (!app.requestSingleInstanceLock()) {
    console.debug("Exiting because another instance is already running");
    app.exit(0);
} else {
    let tray: null | Tray = null;//NOTE: prevent garbage collection

    /** Load the main window
     * @returns `Promise` resolving when the window finishes loading
     */
    function loadWin_main() {
        console.debug("Loading \"main\" window...");
        const win = new BrowserWindow({
            title: app.getName(),
            icon,
            show: false,
            backgroundColor: nativeTheme.shouldUseDarkColors ? "#212121" : "#fff",
            darkTheme: nativeTheme.shouldUseDarkColors,
            fullscreenable: false,
            webPreferences: {
                defaultEncoding: "UTF-8",
                defaultFontFamily: {
                    standard: "sans-serif"
                },
                safeDialogs: true,
                devTools: !app.isPackaged,
                preload: resolve("scripts", "renderer", "index.preload.js"),//NOTE: absolute path
                contextIsolation: true,
                worldSafeExecuteJavaScript: true
            }
        })
            .on("minimize", function (this: BrowserWindow) { return this.hide(); })
            .once("ready-to-show", function (this: BrowserWindow) { this.show(); });
        return win.loadFile("views/index.html")
            .then(() => console.debug("Loaded \"main\" window"))
            .then(() => win);
    }
    /** Open a dialog window to inform about an error when loading a window
     * @param content Contents of the error
     * @example
     * loadWindow().catch(windowError);
     */
    const windowError = dialog.showErrorBox.bind(this, "Could not load window");

    app
        .once("will-quit", _event => globalShortcut.unregisterAll())
        .on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); })
        .on("activate", (_event, hasVisibleWindows) => {
            if (hasVisibleWindows) BrowserWindow.getAllWindows()
                .forEach((win, _idx, _arr) => { if (win.isVisible()) win.focus(); });
            else if (app.isReady()) {
                if (BrowserWindow.getAllWindows().length > 0) BrowserWindow.getAllWindows()
                    .forEach((win, _idx, _arr) => win.show());
                else loadWin_main().catch(windowError);
            }
        })
        .on("web-contents-created", (_event, webContents) => {
            webContents
                .on("will-navigate", (event, _url) => event.preventDefault())//NOTE: prevent navigation
                .on("new-window", (event, _url, _frame, _disposition, _options, _features, _referrer, _postBody) => event.preventDefault());//NOTE: prevent creation of new windows
        })
        .on("second-instance", (_event, _argv, _cwd) => {
            if (BrowserWindow.getAllWindows().length > 0) BrowserWindow.getAllWindows()
                .forEach((win, _idx, _arr) => {
                    if (win.isMinimized()) win.restore();
                    win.focus();
                });
            else loadWin_main().catch(windowError);
        })
        .once("ready", _launchInfo => {
            console.debug("Ready");
            // Install IPC events
            require("./ipc");
            // Setup About panel
            (PACKAGE => app.setAboutPanelOptions({
                applicationName: app.getName(),
                applicationVersion: app.getVersion(),
                copyright: "Licensed under " + PACKAGE.license + " by " + PACKAGE.author,
                version: app.getVersion(),
                credits: undefined,
                authors: [PACKAGE.author, ...(PACKAGE.contributors ?? [])],
                website: undefined,//TODO
                iconPath
            }))(require("../../package.json"));
            // Setup application menu
            appMenu({
                sounds: false
            });
            // Setup tray
            tray = new Tray(icon);
            tray.setToolTip(app.getName());
            tray.setContextMenu(trayMenu);
            // Load main window
            loadWin_main()
                .then(window => { window.once("ready-to-show", function (this: BrowserWindow) { tray!.on("click", (_event, _bounds, _position) => this.show()); }); })
                .catch(windowError);
        });
}
