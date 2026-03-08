import { app } from "electron";
import path from "node:path";

export function getRecordingsDir() {
    return path.join(app.getPath("userData"), "recordings");
}
