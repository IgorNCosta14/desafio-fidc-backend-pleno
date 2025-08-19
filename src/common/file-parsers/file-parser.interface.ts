export interface FileParser<T> {
    canParse(file: Express.Multer.File): boolean;
    parse(file: Express.Multer.File): T[];

    readonly name: string;
}