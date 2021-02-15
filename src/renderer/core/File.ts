
interface InputFileEvent extends Event {
    type: "input"
    target: EventTarget & { files: FileList }
}
interface DropFileEvent extends Event {
    type: "drop"
    dataTransfer: DataTransfer
}

export type FileEvent = InputFileEvent | DropFileEvent;

export type DropEvent = CustomEvent<{ files: File[] }>;

export function getFilesFromEvent(event: FileEvent): File[] {
    const files = [];
    if (event.type === "input") {
        for (const file of event.target.files) {
            files.push(file);
        }
    } else if (event.type === "drop") {
        if (event.dataTransfer.items != null) {
            for (const item of event.dataTransfer.items) {
                if (item.kind === "file") {
                    files.push(item.getAsFile()!);
                }
            }
        } else {
            for (const item of event.dataTransfer.files) {
                files.push(item);
            }
        }
    }
    return files;
}