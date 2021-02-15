
declare namespace Intl {
    type Granularity = "grapheme" | "word" | "sentence";
    interface SegmenterResolvedOptions {
        locale: string
        granularity: "grapheme" | "word" | "sentence"
    }
    interface WordSegment {
        segment: string
        index: number
        input: string
        isWordLike: boolean
    }
    interface Segment {
        segment: string
        index: number
        input: string
    }
    interface Segments<G extends Granularity> {
        containing(index: number): G extends "word" ? WordSegment : Segment;
        [Symbol.iterator](): Iterator<G extends "word" ? WordSegment : Segment>;
    }
    interface Segmenter<L extends string, G extends Granularity> {
        segment(value: string): Segments<G>;
        getResolvedOptions(): SegmenterResolvedOptions;
    }
    interface SegmenterConstructorOptions<G extends Granularity> {
        granularity: G
    }
    interface SegmenterConstructor {
        new <L extends string, G extends Granularity>(locale?: L, options?: SegmenterConstructorOptions<G>): Segmenter<L, G>;
    }
    var Segmenter: SegmenterConstructor;
}