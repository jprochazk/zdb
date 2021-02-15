
declare module "@lapo/extractcms" {
    abstract class CMS {
        static extract(data: Buffer): string;
    }
    export default CMS;
}