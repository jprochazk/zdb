<script lang="typescript">
    import * as FileHandler from "~/renderer/core/ISDS";
    import type { DropEvent } from "~/renderer/core/File";
    import FileUpload from "./Drop.svelte";

    const SPINNER = import.meta.env.SNOWPACK_PUBLIC_BASE_HREF + "/loader.gif";
    const TICK = import.meta.env.SNOWPACK_PUBLIC_BASE_HREF + "/tick.png";
    let HREF = SPINNER;
    let hidden = true;

    let pending = 0;
    function handleFile(event: DropEvent) {
        for (const file of event.detail.files) {
            const pendingFile = {
                name: file.name,
                path: file.path,
                done: false,
            };
            FileHandler.handle(pendingFile).then((_) => {
                pending -= 1;
                if (pending === 0) {
                    HREF = TICK;
                    setTimeout(() => {
                        hidden = true;
                    }, 1500);
                }
            });
            pending += 1;
            HREF = SPINNER;
            hidden = false;
        }
    }
</script>

<div class="spinner-container center valign-wrapper">
    <div>
        {#if pending === 0}
            <img
                class:fade={hidden}
                alt="Loading spinner"
                class="spinner"
                src={HREF}
            />
        {/if}
    </div>
</div>

<div class="container">
    <FileUpload on:input={handleFile} />
</div>

<style>
    .spinner-container {
        position: absolute;
        top: 50%;
        left: 50%;
        z-index: 100;
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .spinner {
        height: 128px;
        width: 128px;
        transition: 3s ease-out;
        opacity: 0.9;
    }

    .fade {
        opacity: 0;
    }
</style>
