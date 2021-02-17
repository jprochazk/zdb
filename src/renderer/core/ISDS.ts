
import { CMS, path, fsp, cachedir, fs } from "~/renderer/core";
import { Message, Person } from "~/renderer/db";

const parser = new DOMParser();

export interface PendingFile {
    name: string;
    path: string;
    done: boolean;
}

interface ISDSFile {
    name: string | null,
    content: string | null,
}

interface ISDSMessage {
    uid: string | null,
    sender: string | null,
    senderAddress: string | null,
    senderId: string | null,
    recipient: string | null,
    recipientAddress: string | null,
    recipientId: string | null,
    annotation: string | null,
    deliveredAt: number | null,
    acceptedAt: number | null,
    files: ISDSFile[]
}

async function exists(path: string) {
    return fsp.access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

// process:
// 1. extract content
// 2. extract everything except files
// 3. for each file, decode base64 and save it 

// document query shorthands, because they can get quite verbose...
const v = (el: Element, name: string) => el.getElementsByTagName(name)[0]?.textContent;
const d = (el: Element, name: string) => {
    let p = el.getElementsByTagName(name)[0]?.textContent;
    if (p) return Number(new Date(p));
    else return null;
}
const va = (el: Element, name: string) => [...el.getElementsByTagName(name)];
const a = (el: Element, key: string) => el.getAttribute(key);

export async function handle(file: PendingFile): Promise<void | string> {
    console.log(`Processing ${file.name}`);
    const data = await CMS.extract(file.path);

    const xml = parser.parseFromString(data, "text/xml");
    const root = xml.getElementsByTagName("q:MessageDownloadResponse")[0];

    const processed: ISDSMessage = {
        uid: v(root, "p:dmID"),
        sender: v(root, "p:dmSender"),
        senderAddress: v(root, "p:dmSenderAddress"),
        senderId: v(root, "p:dbIDSender"),
        recipient: v(root, "p:dmRecipient"),
        recipientAddress: v(root, "p:dmRecipientAddress"),
        recipientId: v(root, "p:dbIDRecipient"),
        annotation: v(root, "p:dmAnnotation"),
        deliveredAt: d(root, "q:dmDeliveryTime"),
        acceptedAt: d(root, "q:dmAcceptanceTime"),
        files: va(root, "p:dmFile").map(node => ({
            name: a(node, "dmFileDescr"),
            content: v(node, "p:dmEncodedContent")
        }))
    };

    // TODO: once tested, this should be removed.
    for (const key of Object.keys(processed) as (keyof ISDSMessage)[]) {
        if (processed[key] == null) {
            throw new Error(`Field ${key} is null for '${file.path}'`);
        }
    }

    for (const pfile of processed!.files) {
        for (const key of Object.keys(pfile) as (keyof ISDSFile)[]) {
            if (pfile[key] == null)
                throw new Error(`Field ${key} is null in one of the files of '${file.path}'`);
        }
    }

    console.log(processed);

    // create directory for storing this document's embedded content
    const base = path.join(cachedir, processed.uid!);
    if (await exists(base)) return console.warn(`Dokument '${file.name}' už je uložený`);
    console.log(`mkdir ${base}`);
    await fsp.mkdir(base);

    // then decode each base64-encoded file content
    // and save it to the directory
    const paths: string[] = [];
    for (const file of processed.files) {
        const filePath = path.join(base, file.name!);
        const content = Buffer.from(file.content!, "base64");
        console.log(`writeFile ${filePath}, ${content.byteLength}`);
        await fsp.writeFile(filePath, content);
        paths.push(filePath);
    }

    const message = new Message(
        processed.uid!,
        processed.senderId!,
        processed.sender!,
        processed.recipientId!,
        processed.recipient!,
        processed.annotation!,
        processed.deliveredAt!,
        processed.acceptedAt!,
        paths!
    );

    await message.save();
    console.log(`persisted message`, message);

    // get sender and recipient, then update their sentIds and receivedIds, respectively
    // if either one doesn't exist, create them
    // then persist
    let [sender, recipient] = await Promise.all([
        Person.byUid(processed.senderId!),
        Person.byUid(processed.recipientId!)
    ]);
    if (!sender) sender = new Person(processed.senderId!, processed.sender!, processed.senderAddress!);
    else sender.sentIds.push(message.uid);

    if (!recipient) recipient = new Person(processed.recipientId!, processed.recipient!, processed.recipientAddress!);
    else recipient.receivedIds.push(message.uid);

    await Promise.all([
        sender.save(),
        recipient.save()
    ]);
    console.log(`persisted sender`, sender);
    console.log(`persisted recipient`, recipient);
}