import { IsBoolean, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

// export function excelSerialToDate(value: any): Date | null {
//     if (value === null || value === undefined || value === '') return null;

//     if (value instanceof Date && !isNaN(value.getTime())) return value;

//     if (typeof value === 'string') {
//         const date = new Date(value);

//         return isNaN(date.getTime()) ? null : date;
//     }

//     if (typeof value === 'number') {
//         const excelEpoch = new Date(Date.UTC(1899, 11, 30));
//         const ms = Math.round(value * 24 * 60 * 60 * 1000);

//         return new Date(excelEpoch.getTime() + ms);
//     }
//     return null;
// }

// export function toBoolean(value: any): boolean | null {
//     if (value === null || value === undefined || value === '') return null;
//     if (typeof value === 'boolean') return value;
//     if (typeof value === 'number') return value !== 0;
//     if (typeof value === 'string') {
//         const v = value.trim().toLowerCase();
//         if (v === 'true' || v === '1' || v === 'yes') return true;
//         if (v === 'false' || v === '0' || v === 'no') return false;
//     }
//     return null;
// }

// export function toNumber(value: any): number | null {
//     if (value === null || value === undefined || value === '') return null;
//     if (typeof value === 'number') return value;
//     if (typeof value === 'string') {
//         const normalized = value.replace(/\./g, '').replace(',', '.');
//         const num = Number(normalized);
//         return isNaN(num) ? null : num;
//     }
//     return null;
// }

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class TransactionDto {
    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'due_date must be YYYY-MM-DD' })
    due_date: string;

    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'actual_due_date must be YYYY-MM-DD' })
    actual_due_date: string;

    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'creation_date must be YYYY-MM-DD' })
    creation_date: string;

    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'reference_date must be YYYY-MM-DD' })
    reference_date: string;

    @IsNumber()
    amount: number;

    @IsNumber()
    transaction_type_id: number;

    @IsString()
    abbreviated_description: string;

    @IsBoolean()
    is_credit: boolean;

    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'start_date must be YYYY-MM-DD' })
    start_date: string;

    @IsOptional()
    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'end_date must be YYYY-MM-DD' })
    end_date?: string;
}