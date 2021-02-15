<script lang="typescript">
    import { shell, path } from "~/renderer/core";
    import { onMount, onDestroy } from "svelte";
    import { Message, getWords } from "~/renderer/db";

    // Generators for test data
    /* function randomDigits(count: number) {
        // minimum is 1 digit
        count = count < 1 ? 1 : count;
        let min = parseInt("1" + "0".repeat(count - 1)),
            max = parseInt("9".repeat(count));
        return Math.floor(Math.random() * (max - min) + min);
    }
    function randomMessage() {
        let now = Date.now();
        let uid = `${randomDigits(8)}`;
        let senderId = `tx${randomDigits(4)}`;
        let recipientId = `rx${randomDigits(4)}`;
        return new Message(
            uid,
            senderId,
            `sender#${senderId}`,
            recipientId,
            `recipient#${recipientId}`,
            `MSG#${uid}`,
            now,
            now,
            new Array(5).fill(`file_from_${uid}.pdf`)
        );
    }
    let results: Message[] = new Array(50)
        .fill(null)
        .map((v) => randomMessage());
    const update = () => {}; */

    const format = {
        _dts: new Intl.DateTimeFormat("cs-CZ", {
            //@ts-ignore
            timeStyle: "medium",
            dateStyle: "short",
        }),
        /**
         * Treats `ms` as a UNIX timestamp in milliseconds,
         * and formats it using the 'cs-CZ' locale with "medium" style
         */
        date: (ms: number) => format._dts.format(ms),
        _dtl: new Intl.DateTimeFormat("cs-CZ", {
            //@ts-ignore
            timeStyle: "medium",
            dateStyle: "long",
        }),
        /**
         * Treats `ms` as a UNIX timestamp in milliseconds,
         * and formats it using the 'cs-CZ' locale with "long" style
         */
        ldate: (ms: number) => format._dtl.format(ms),
        path: (full: string) => path.basename(full),
    };
    const openFile = async (path: string) => {
        const err = await shell.openPath(path);
        if (err !== "") {
            console.error(err);
        }
    };

    let form = {
        recipient: "",
        sender: "",
    };
    let formChanged = true;
    let results: Message[] = [];
    const update = () => ((formChanged = true), void 0);

    // selected message - displayed in a modal
    let selected: Message | null = null;
    const select = (result: Message) => ((selected = result), void 0);
    const deselect = () => ((selected = null), void 0);

    // interval ID so we can clear it on component destruction
    let updateInterval: NodeJS.Timeout;
    onMount(() => {
        // search results update every 250ms
        // but ONLY if the form fields have changed
        updateInterval = setInterval(async () => {
            if (!formChanged) return;
            formChanged = false;

            // TODO: paging
            // search for all messages which include "form.recipient"
            //  - if form.recipient is empty, this returns all messages
            let tempResults = Message.byRecipientName(form.recipient).limit(10);
            // if we have a non-empty sender field,
            //  - filter the result based on whether or not the sender appears in them
            if (form.sender.length > 0) {
                const senderName = getWords(form.sender.toLowerCase());
                const predicate = (msg: Message) =>
                    msg.senderNameWords.some((word) =>
                        senderName.includes(word)
                    );
                tempResults = tempResults.filter(predicate);
            }
            results = await tempResults.toArray();
        }, 250);
    });
    onDestroy(() => {
        clearInterval(updateInterval);
    });
</script>

{#if selected != null}
    <div class="display-backdrop no-overflow" on:click={deselect} />
    <div class="display no-overflow">
        <!-- svelte-ignore a11y-missing-attribute -->
        <div class="row" style="height: 30px">
            <a class="close-button right" on:click={deselect}>
                <i class="material-icons">close</i>
            </a>
        </div>
        <div
            class="container"
            style="height: calc(100% - 50px); overflow: auto;"
        >
            <div class="row left">
                <div class="col s2 item-space">
                    <span class="hint">Popis:</span>
                </div>
                <div class="col s10 item-space">
                    <b>{selected.annotation}</b>
                </div>
                <div class="col s2 item-space">
                    <span class="hint">Odeslání:</span>
                </div>
                <div class="col s10 item-space">
                    <b>{format.ldate(selected.receivedAt)}</b>
                </div>
                <div class="col s2 item-space">
                    <span class="hint">Přijetí:</span>
                </div>
                <div class="col s10 item-space">
                    <b>{format.ldate(selected.receivedAt)}</b>
                </div>
                <div class="col s2 item-space">
                    <span class="hint">Odesílatel:</span>
                </div>
                <div class="col s10 item-space">
                    <b>{selected.senderName}</b>
                </div>
                <div class="col s2 item-space">
                    <span class="hint">Příjemce:</span>
                </div>
                <div class="col s10 item-space">
                    <b>{selected.recipientName}</b>
                </div>
                <div class="col s12 item-space"><b>Přílohy:</b></div>
                <div class="col s12">
                    <ul class="collection">
                        {#each selected.files as file}
                            <li class="collection-item">
                                <!-- svelte-ignore a11y-missing-attribute -->
                                <a
                                    style="cursor: pointer"
                                    on:click={() => openFile(file)}
                                >
                                    {format.path(file)}
                                </a>
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>
        </div>
    </div>
{/if}

<div class="search">
    <form>
        <div class="row">
            <div class="row col s6 m6 l6 xl6">
                <label for="recipient">Příjemce</label>
                <input
                    id="recipient"
                    class="col"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck={false}
                    type="search"
                    bind:value={form.recipient}
                    on:input={update}
                />
            </div>
            <div class="row col s6 m6 l6 xl6">
                <label for="sender">Odesílatel</label>
                <input
                    id="sender"
                    class="col"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck={false}
                    type="search"
                    bind:value={form.sender}
                    on:input={update}
                />
            </div>
        </div>
    </form>
    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th class="center">Datum</th>
                    <th class="center">Číslo zprávy</th>
                    <th class="center">Příjemce</th>
                    <th class="center">Odesílatel</th>
                    <th class="center">Předmět</th>
                </tr>
            </thead>
            <tbody>
                {#each results as result}
                    <tr
                        class="hoverable"
                        on:click={select.bind(undefined, result)}
                    >
                        <td class="center">{format.date(result.deliveredAt)}</td
                        >
                        <td class="center">{result.uid}</td>
                        <td class="center">{result.recipientName}</td>
                        <td class="center">{result.senderName}</td>
                        <td class="center">{result.annotation}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>

<style>
    form {
        height: 120px;
    }

    div.display-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        opacity: 0.4;
        background-color: black;
    }
    div.display {
        position: absolute;
        top: 10vh;
        left: 10vw;
        width: 80vw;
        height: calc(100% - 20vh);
        padding: 10px;
        background-color: white;
        border-radius: 8px;
    }
    a.close-button {
        position: relative;
        cursor: pointer;
    }
    .item-space {
        height: auto;
        padding-top: 0.5em;
        padding-bottom: 0.5em;
    }

    div.search {
        margin-top: 20px;
        height: calc(100% - 20px);
    }

    div.table-wrapper {
        height: calc(100% - 120px);
    }
    tbody {
        display: block;
        height: calc(100% - 92px);
        overflow: auto;
    }
    thead,
    tbody tr {
        display: table;
        width: 100%;
        table-layout: fixed;
    }
    thead {
        width: calc(100% - 1em);
        height: 52px;
    }
    table {
        width: 100%;
        height: 100%;
    }
</style>
