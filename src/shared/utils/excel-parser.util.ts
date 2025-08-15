import * as XLSX from 'xlsx';

export class ExcelParserUtil {
    static parse(buffer: Buffer): any[] {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        return json;
    }
}