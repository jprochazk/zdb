<script lang="typescript">
    import type { FileEvent } from "~/renderer/core/File";
    import { getFilesFromEvent } from "~/renderer/core/File";
    import { createEventDispatcher } from "svelte";

    let dragging = false;
    const dispatch = createEventDispatcher();

    function startDragging() {
        dragging = true;
    }
    function stopDragging() {
        dragging = false;
    }

    const onFile = (event: Event) => {
        stopDragging();
        dispatch("input", { files: getFilesFromEvent(event as FileEvent) });
    };
</script>

<div class="row">
    <div class="col s12 m12 l12 xl12 center">
        <label
            class="card-panel hoverable waves-effect waves-block waves-green hovicon"
            on:drop|preventDefault={onFile}
            on:dragover|preventDefault={startDragging}
            on:dragleave|preventDefault={stopDragging}
            for="upload"
        >
            <span>Nahrát soubory</span><br />
            <span class="hint">
                (kliknutím nebo přesunutím souborů do pole)
            </span>
            <input
                id="upload"
                hidden={true}
                type="file"
                multiple={true}
                on:input={onFile}
            />
        </label>
    </div>
</div>

<style>
    label.card-panel {
        height: 50vh;
    }
</style>
