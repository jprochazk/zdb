import Dexie, { PromiseExtended } from "dexie";

// TODO: paging, where it makes sense

// TODO: move to utils
const wordSegmenter = new Intl.Segmenter("cs-CZ", { granularity: "word" });
/* const graphemeSegmenter = new Intl.Segmenter("cs-CZ", { granularity: "grapheme" }); */
/**
 * Uses the Intl API to retrieve all word-like segments from a string.
 */
export function getWords(sentence: string): string[] {
    let words = new Set<string>();
    for (const item of wordSegmenter.segment(sentence.toLowerCase())) {
        if (item.isWordLike && !words.has(item.segment)) {
            words.add(item.segment);
        }
    }
    return [...words.values()];
}

const schema = {
    person: `
        ++id,
        &uid,
        name,
        *nameWords,
        address,
        *sentIds,
        *receivedIds`,
    message: `
        ++id,
        &uid,
        senderId,
        senderName,
        *senderNameWords,
        recipientId,
        recipientName,
        *recipientNameWords,
        deliveredAt,
        acceptedAt`
    //  annotation
    //  *files
};

export class Database extends Dexie {
    person: Dexie.Table<Person, number>;
    message: Dexie.Table<Message, number>;

    private static instance: Database | null = null;
    private constructor() {
        super("zdb");
        this.version(1).stores(schema);

        this.person = this.table("person");
        this.person.mapToClass(Person);

        this.message = this.table("message");
        this.message.mapToClass(Message);

        Database.instance = this;

        //@ts-ignore
        window.db = this;
    }

    static init(): Database {
        if (Database.instance != null)
            throw new Error(`Database already initialized`);

        Database.instance = new Database();
        return Database.instance;
    }

    static get(): Database {
        if (Database.instance == null)
            throw new Error(`Database is not initialized`);
        return Database.instance;
    }
}

export class Person {
    id?: number;
    uid: string;
    name: string;
    nameWords: string[];
    address: string;
    sentIds: string[];
    receivedIds: string[];

    constructor(
        uid: string,
        name: string,
        address: string
    ) {
        this.uid = uid;
        this.name = name;
        this.nameWords = getWords(name);
        this.address = address;
        this.sentIds = [];
        this.receivedIds = [];
    }

    /**
     * Saves the entity
     */
    async save() {
        const db = Database.get();
        if (this.id != null) {
            await db.person.update(this.id, {
                name: this.nameWords,
                address: this.address,
                sentIds: this.sentIds,
                receivedIds: this.receivedIds,
            });
        } else {
            const id = await db.person.put(this);
            this.id = id;
        }
        return this;
    }

    /**
     * Returns this person's sent and received messages.
     */
    async getMessages() {
        const db = Database.get();
        let [sent, received] = await Promise.all([
            db.message.where("uid").anyOf(this.sentIds).distinct().toArray(),
            db.message.where("uid").anyOf(this.receivedIds).distinct().toArray()
        ]);
        return { sent, received };
    }

    /**
     * Returns all people who've sent this person a message.
     */
    async getSenders() {
        const db = Database.get();
        return await db.person
            // find all distinct people, which have sent any of the messages this person has received
            .where("sentIds").anyOf(this.receivedIds)
            .distinct()
            .toArray();
    }

    /**
     * Returns all people, with a name similar to `name`,
     * who've sent this person a message.
     */
    async getSendersByName(name: string) {
        const words = getWords(name.toLowerCase());
        const db = Database.get();
        return await db.person
            // find all distinct people, which have sent any of the messages this person has received
            .where("sentIds").anyOf(this.receivedIds)
            .distinct()
            // and where their name is similar to `name`
            .and(person => person.nameWords.some(word => words.includes(word)))
            .toArray();
    }

    /**
     * Clear the `person` table.
     */
    static async clear() {
        const db = Database.get();
        return await db.person.clear();
    }

    /**
     * Fetches person with id == `id`.
     */
    static async byId(id: number) {
        const db = Database.get();
        return await db.person.get(id);
    }

    /**
     * Fetches people with uid that starts with `uid`.
     */
    static async byUid(uid: string) {
        const db = Database.get();
        return await db.person
            .where("uid").startsWith(uid)
            .first();
    }

    /**
     * Fetches people with name similar to `name`.
     */
    static async byName(name: string) {
        const db = Database.get();
        return await db.person
            .where("nameWords").anyOf(getWords(name.toLowerCase()))
            .distinct()
            .toArray();
    }

    static async all(): Promise<Person[]>;
    static async all(page: number, count: number): Promise<Person[]>;
    static async all(page?: number, count?: number): Promise<Person[]> {
        const db = Database.get();
        if (page != null) {
            return await db.person
                .offset(page * count!).limit(count!)
                .toArray();
        }
        else {
            return await db.person
                .toArray();
        }
    }
}

export class Message {
    /** Not null if it was read from DB. */
    id?: number;
    uid: string;
    senderId: string;
    senderName: string;
    senderNameWords: string[];
    recipientId: string;
    recipientName: string;
    recipientNameWords: string[];
    annotation: string;
    deliveredAt: number;
    receivedAt: number;
    files: string[];

    constructor(
        uid: string,
        senderId: string,
        senderName: string,
        recipientId: string,
        recipientName: string,
        annotation: string,
        deliveredAt: number,
        receivedAt: number,
        files: string[]
    ) {
        this.uid = uid;
        this.senderId = senderId;
        this.senderName = senderName;
        this.senderNameWords = getWords(senderName.toLowerCase());
        this.recipientId = recipientId;
        this.recipientName = recipientName;
        this.recipientNameWords = getWords(recipientName.toLowerCase());
        this.annotation = annotation;
        this.deliveredAt = deliveredAt;
        this.receivedAt = receivedAt;
        this.files = files;
    }

    /**
     * Saves the entity
     */
    async save() {
        const db = Database.get();
        if (this.id != null) {
            throw new Error(`Messages cannot be updated!`);
        } else {
            const id = await db.message.put(this);
            this.id = id;
        }
    }

    async getRecipient() {
        const db = Database.get();
        return await db.person.where("uid").equals(this.recipientId).first();
    }

    async getSender() {
        const db = Database.get();
        return await db.person.where("uid").equals(this.senderId).first();
    }

    /**
     * Delete all entities
     */
    static async clear() {
        const db = Database.get();
        return await db.message
            .clear();
    }

    static async byId(id: number) {
        const db = Database.get();
        return await db.message
            .get(id);
    }

    static async byUid(uid: string) {
        const db = Database.get();
        return await db.message
            .where("uid").startsWith(uid)
            .first();
    }

    /**
     * Get all messages by `recipientName`
     * 
     * NOTE: if `name` is empty, returns every message
     */
    static byRecipientName(name: string) {
        const db = Database.get();
        if (name === "") {
            return db.message;
        } else {
            return db.message
                .where("recipientNameWords").anyOf(getWords(name.toLowerCase()))
                .distinct();
        }
    }

    static async all(): Promise<Message[]>;
    static async all(page: number, count: number): Promise<Message[]>;
    static async all(page?: number, count?: number): Promise<Message[]> {
        const db = Database.get();
        if (page != null) {
            return await db.message
                .offset(page * count!).limit(count!)
                .toArray();
        }
        else {
            return await db.message
                .toArray();
        }
    }
}
