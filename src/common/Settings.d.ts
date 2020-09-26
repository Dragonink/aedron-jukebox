import { Accelerator } from "electron";

/** Settings definition */
export default interface Settings {
    readonly version: 1,
    keybinds: {
        /** Modifier keys for other accelerators */
        modifier: Accelerator;
        /** Keybind (appended to `modifier`) to play the sound 0 */
        sound0: Accelerator;
        /** Keybind (appended to `modifier`) to play the sound 1 */
        sound1: Accelerator;
        /** Keybind (appended to `modifier`) to play the sound 2 */
        sound2: Accelerator;
        /** Keybind (appended to `modifier`) to play the sound 3 */
        sound3: Accelerator;
        /** Keybind (appended to `modifier`) to play the sound 4 */
        sound4: Accelerator;
        /** Keybind (appended to `modifier`) to play the sound 5 */
        sound5: Accelerator;
        /** Keybind (appended to `modifier`) to play the sound 6 */
        sound6: Accelerator;
        /** Keybind (appended to `modifier`) to play the sound 7 */
        sound7: Accelerator;
        /** Keybind (appended to `modifier`) to play the sound 8 */
        sound8: Accelerator;
        /** Keybind (appended to `modifier`) to play the sound 9 */
        sound9: Accelerator;
        /** Keybind (appended to `modifier`) to stop the sound */
        stop: Accelerator;
        /** Keybind (appended to `modifier`) to use the next sound set */
        nextSet: Accelerator;
        /** Keybind (appended to `modifier`) to use the previous sound set */
        prevSet: Accelerator;
    };
}
