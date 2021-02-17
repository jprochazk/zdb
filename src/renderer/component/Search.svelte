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
    const testResults = new Array(45).fill(null).map((_) => randomMessage()); */

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
        annotation: "",
    };
    let formChanged = true;
    let results: Message[] = [];
    const updateForm = () => ((formChanged = true), void 0);

    // selected message - displayed in a modal
    let selected: Message | null = null;
    const select = (result: Message) => ((selected = result), void 0);
    const deselect = () => ((selected = null), void 0);

    const escapeListener = (e: KeyboardEvent) => (
        console.log(e), e.code === "Escape" && deselect()
    );

    const pageSize = 10;
    let page = 0;
    let numPages = 0;
    let currentPage: Message[] = [];
    function goto(v: number) {
        if (v > -1 && v < Math.ceil(results.length / pageSize)) {
            page = v;
            let remaining = results.slice(page * pageSize);
            if (remaining.length > pageSize) {
                remaining = remaining.slice(0, pageSize);
            }
            currentPage = remaining;
        }
    }

    function intersection(a: string[], b: string[]): boolean {
        return a.some((_a) =>
            b.some((_b) => _b.startsWith(_a) || _a.startsWith(_b))
        );
    }

    // interval ID so we can clear it on component destruction
    let updateInterval: NodeJS.Timeout;
    onMount(() => {
        window.addEventListener("keyup", escapeListener);
        // search results update every 250ms
        // but ONLY if the form fields have changed
        updateInterval = setInterval(async () => {
            if (formChanged) {
                formChanged = false;

                // TODO: paging
                // search for all messages which include "form.recipient"
                //  - if form.recipient is empty, this returns all messages
                let tempResults = Message.byRecipientName(form.recipient).limit(
                    100
                );
                if (form.recipient.length > 0) {
                    tempResults = tempResults.filter((msg) =>
                        intersection(
                            msg.recipientNameWords,
                            getWords(form.recipient.toLowerCase())
                        )
                    );
                }
                /* let tempResults =
                    form.recipient.length > 0
                        ? testResults.filter((msg) =>
                              intersection(
                                  msg.recipientNameWords,
                                  getWords(form.recipient.toLowerCase())
                              )
                          )
                        : testResults; */
                // if we have a non-empty sender field,
                //  - filter the result based on whether or not the sender appears in them
                if (form.sender.length > 0) {
                    tempResults = tempResults.filter((msg) =>
                        intersection(
                            msg.senderNameWords,
                            getWords(form.sender.toLowerCase())
                        )
                    );
                }
                // if we have a non-empty annotation field,
                //  - same story
                if (form.annotation.length > 0) {
                    tempResults = tempResults.filter((msg) =>
                        intersection(
                            msg.annotationWords,
                            getWords(form.annotation.toLowerCase())
                        )
                    );
                }
                results = await tempResults.toArray();
                /* results = tempResults; */
                numPages = Math.ceil(results.length / pageSize);
                goto(0);
            }
        }, 250);
    });
    onDestroy(() => {
        window.removeEventListener("keyup", escapeListener);
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
                    <span class="hint">Předmět:</span>
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
            <div class="row col s4 m4 l4 xl4">
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
                    on:input={updateForm}
                />
            </div>
            <div class="row col s4 m4 l4 xl4">
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
                    on:input={updateForm}
                />
            </div>
            <div class="row col s4 m4 l4 xl4">
                <label for="sender">Předmět</label>
                <input
                    id="sender"
                    class="col"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck={false}
                    type="search"
                    bind:value={form.annotation}
                    on:input={updateForm}
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
                {#each currentPage as result}
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
    <div class="paging">
        <div class="row">
            <ul class="pagination noselect">
                <li class:disabled={page - 1 < 0}>
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <a style="cursor:pointer" on:click={() => goto(page + 1)}>
                        <i class="material-icons">chevron_left</i>
                    </a>
                </li>
                {#each new Array(numPages) as _, p}
                    <li
                        class:active={p === page}
                        class:waves-effect={p !== page}
                        on:click={() => goto(p)}
                    >
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <a style="cursor:pointer">{p + 1}</a>
                    </li>
                {/each}
                <li class:disabled={page + 1 >= numPages}>
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <a
                        class="noselect"
                        style="cursor:pointer"
                        on:click={() => goto(page + 1)}
                    >
                        <i class="material-icons">chevron_right</i>
                    </a>
                </li>
            </ul>
        </div>
    </div>
</div>

<style>
    .noselect {
        user-select: none;
    }

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
        height: calc(100% - 200px);
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
