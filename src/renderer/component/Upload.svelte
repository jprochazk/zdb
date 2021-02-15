<script lang="typescript">
    import type { PendingFile } from "~/renderer/core/ISDS";
    import * as FileHandler from "~/renderer/core/ISDS";
    import type { DropEvent } from "~/renderer/core/File";
    import FileUpload from "./Drop.svelte";

    function handleFile(event: DropEvent) {
        for (const file of event.detail.files) {
            const pendingFile = {
                name: file.name,
                path: file.path,
                done: false,
            };
            FileHandler.handle(pendingFile);
        }
    }
</script>

<div class="container">
    <FileUpload on:input={handleFile} />
</div>
