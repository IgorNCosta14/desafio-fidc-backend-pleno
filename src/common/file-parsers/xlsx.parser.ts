import * as XLSX from 'xlsx';
import { FileParser } from './file-parser.interface';

export class XlsxParser implements FileParser<Record<string, any>> {
    name = 'xlsx';

    canParse(file: Express.Multer.File): boolean {
        return /xlsx$/i.test(file.originalname);
    }

    parse(file: Express.Multer.File): Record<string, any>[] {
        const wb = XLSX.read(file.buffer, {
            type: 'buffer',
            cellDates: true,
            cellNF: false,
            cellText: false,
            dateNF: 'yyyy-mm-dd',
        });

        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });

        return rows as Record<string, any>[];
    }
}
