declare module 'color-parser' {
    function colorParser(
        colorString: string
    ): { r: number; g: number; b: number };
    namespace colorParser {}
    export = colorParser;
}
