export class ExcelParserUtil {
    static excelSerialToDate(value: number | string | Date | null | undefined): Date | null {
        if (value === null || value === undefined || value === '') return null;
        if (value instanceof Date && !isNaN(value.getTime())) return value;

        if (typeof value === 'string') {
            const d = new Date(value);

            return isNaN(d.getTime()) ? null : d;
        }

        if (typeof value === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const ms = Math.round(value * 24 * 60 * 60 * 1000);

            return new Date(excelEpoch.getTime() + ms);
        }

        return null;
    }
}