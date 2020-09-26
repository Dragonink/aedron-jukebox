import ElectronWindow from "./index.preload";
declare var window: ElectronWindow;

{
    const tbody = document.querySelector<HTMLTableSectionElement>("main > div.panel > table#sounds > tbody")!;

    {//SECTION Finish page
        const template = tbody.querySelector<HTMLTemplateElement>("template#sound")!.content;
        for (let r = 0; r < 10; r++) {
            const clone = template.cloneNode(true) as DocumentFragment;
            clone.querySelector<HTMLTableHeaderCellElement>("tr > th")!.innerText = r.toString();
            tbody.appendChild(clone);
        }
    }//!SECTION

    {//SECTION Setup IPC
        /** "Polyfill" type for the `sinkId` experimental technology */
        type Audio = HTMLAudioElement & {
            /** ID of the audio device used for output */
            readonly sinkId: MediaDeviceInfo["deviceId"];
            /** Set the ID of the audio device to use for output
             * @param sinkId ID of the audio output device
             * @returns `Promise` that resolves with `undefined`; or rejects if the device cannot be used
             */
            setSinkId: (sinkId: MediaDeviceInfo["deviceId"]) => Promise<undefined>;
        };
        /** Audio elements for selected devices */
        const audioDevices: Audio[] = [];
        const soundSet = tbody.querySelectorAll("tr");
        /** Index of the played sound */
        let playing: null | number = null;

        const stop: typeof window.electron.ipc.sounds_stop extends (listener: infer T) => void ? T : unknown = function () {
            if (playing !== null) {
                for (const audio of audioDevices) audio.pause();
                soundSet[playing].classList.remove("playing");
                console.debug("Stopped sound \"%s\"", soundSet[playing].getAttribute("data-path")!);
                playing = null;
            }
        };
        {//SECTION sounds:play & sounds:stop
            window.electron.ipc.sounds_play(sound => {
                stop();
                const path = soundSet[sound].getAttribute("data-path")!;
                if (path !== "") {
                    playing = sound;
                    for (const audio of audioDevices) {
                        audio.src = path;
                        audio.load();
                    }
                    soundSet[sound].classList.add("playing");
                }
                return path;
            });
            window.electron.ipc.sounds_stop(stop);

        }//!SECTION
        {
            const select = document.querySelector<HTMLSelectElement>("main > div.panel > form#sets select")!;

            select.onchange = function (_event) {
                const sounds: { [sound: string]: undefined | false; } = {};
                soundSet.forEach((tr, idx, _arr) => {
                    let sound = select.options[select.selectedIndex].getAttribute("data-sound" + idx);
                    if (sound === null || sound === "") {
                        sound = "";
                        sounds["sound" + idx] = false;
                    }
                    tr.setAttribute("data-path", sound);
                    tr.querySelector("td")!.setAttribute("data-path", sound);
                });
                if (select.selectedIndex > -1) {
                    window.electron.menu.reload({ sounds });
                    return console.debug("Selected set \"%s\"", select.options[select.selectedIndex].value);
                } else {
                    window.electron.menu.reload({ sounds: false });
                    return console.debug("No selected set");
                }
            };
            {//SECTION sounds:sets:load
                const template = select.querySelector<HTMLTemplateElement>("template#set")!.content;

                window.electron.ipc.sounds_sets_load(files => {
                    stop();
                    // Clear old sets
                    document.querySelectorAll<HTMLOptionElement>("main > div.panel > form#sets select > option")
                        .forEach((node, _idx, _arr) => { select.removeChild(node); });
                    // Display new sets
                    for (const file of files) {
                        const clone = template.cloneNode(true) as DocumentFragment;
                        const option = clone.querySelector("option")!;
                        option.innerText = file.name;
                        file.content.split("\n").slice(0, 10)
                            .forEach((line, idx, _arr) => option.setAttribute("data-sound" + idx, line.trim()));
                        select.appendChild(clone);
                    }
                    select.selectedIndex = -1;
                    if (select.options.length >= 0) select.selectedIndex = 0;
                    select.dispatchEvent(new Event("change", { bubbles: true, cancelable: false }));//NOTE: `selectedIndex` does not dispatch `change` event
                });
            }//!SECTION
            {//SECTION sounds:sets:select
                window.electron.ipc.sounds_sets_select(di => {
                    stop();
                    const length = document.querySelectorAll<HTMLOptionElement>("main > div.panel > form#sets select > option").length;
                    if (length > 0) {
                        select.selectedIndex = (select.selectedIndex + di + length) % length;
                        select.dispatchEvent(new Event("change", { bubbles: true, cancelable: false }));//NOTE: `selectedIndex` does not dispatch `change` event
                    }
                });
            }//!SECTION
        }
        {//SECTION devices:load
            const form = document.querySelector<HTMLFormElement>("main > form.panel#devices")!;
            const template = form.querySelector<HTMLTemplateElement>("template#device")!.content;

            window.electron.ipc.devices_load(devices => {
                stop();
                // Clear old devices
                audioDevices.length = 0;
                document.querySelectorAll<HTMLDivElement>("main > form.panel#devices > div")
                    .forEach((node, _idx, _arr) => { form.removeChild(node); });
                // Display new devices
                const groups: MediaDeviceInfo["groupId"][] = [];
                for (const device of devices) if (!groups.includes(device.groupId)) {
                    groups.push(device.groupId);
                    const clone = template.cloneNode(true) as DocumentFragment;
                    const input = clone.querySelector("input")!;
                    const label = clone.querySelector("label")!;
                    input.setAttribute("name", device.deviceId);
                    label.setAttribute("for", device.deviceId);
                    label.innerText = device.label
                        .replace(/^(?:Default|Communications)\s*-\s*/, "")
                        .replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i, "")
                        .replace(/^(.+)\s\(\1\)$/, "$1");
                    input.onclick = function (_event) {
                        if ((this as HTMLInputElement).checked) {
                            // Create audio element if checked
                            const audio = new Audio() as Audio;
                            audio.oncanplaythrough = function (_event) {
                                return (this as HTMLAudioElement).play();
                            };
                            audio.setSinkId(device.deviceId)
                                .then(() => {
                                    audioDevices.push(audio);
                                    console.debug("Enabled device \"%s\"", device.deviceId);
                                })
                                .catch(error => {
                                    console.error(error);
                                    (this as HTMLInputElement).setAttribute("disabled", "");
                                });
                        } else {
                            // Remove audio element if unchecked
                            audioDevices.splice(audioDevices.findIndex((audio, _idx, _arr) => audio.sinkId === device.deviceId), 1);
                            console.debug("Disabled device \"%s\"", device.deviceId);
                        }
                    };
                    if (device.deviceId === "default") input.click();//NOTE: enable default device
                    form.appendChild(clone);
                }
                return groups.length;
            });
        }//!SECTION
    }//!SECTION
}
