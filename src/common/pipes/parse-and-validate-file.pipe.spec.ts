import { BadRequestException } from '@nestjs/common';
import { ParseAndValidateFilePipe } from './parse-and-validate-file.pipe';
import * as classValidator from 'class-validator';

type MulterFile = Partial<Express.Multer.File>;

const file: MulterFile = { originalname: 'input.xlsx', buffer: Buffer.from('x') };

function stubParser(rows: any[] | Error, name = 'XLSX') {
    return {
        name,
        canParse: (_f: MulterFile) => true,
        parse: (_f: MulterFile) => {
            if (rows instanceof Error) throw rows;
            return rows;
        },
    };
}

describe('ParseAndValidateFilePipe', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('throws 400 when no file', () => {
        const pipe = new ParseAndValidateFilePipe();
        expect(() => pipe.transform(undefined as any)).toThrow(BadRequestException);
        try {
            pipe.transform(undefined as any);
        } catch (e: any) {
            expect(e.message).toBe('File is required');
        }
    });

    it('throws 400 when unsupported file format (no parser matches)', () => {
        const pipe = new ParseAndValidateFilePipe();
        (pipe as any).parsers = [];
        expect(() => pipe.transform(file as any)).toThrow(BadRequestException);
        try {
            pipe.transform(file as any);
        } catch (e: any) {
            expect(e.message).toBe('Unsupported file format');
        }
    });

    it('throws 400 when parser throws while parsing', () => {
        const pipe = new ParseAndValidateFilePipe();
        (pipe as any).parsers = [stubParser(new Error('boom'), 'XLSX')];
        expect(() => pipe.transform(file as any)).toThrow(BadRequestException);
        try {
            pipe.transform(file as any);
        } catch (e: any) {
            expect(e.message).toBe('Failed to parse XLSX file');
        }
    });

    it('throws 400 when file has no rows', () => {
        const pipe = new ParseAndValidateFilePipe();
        (pipe as any).parsers = [stubParser([])];
        expect(() => pipe.transform(file as any)).toThrow(BadRequestException);
        try {
            pipe.transform(file as any);
        } catch (e: any) {
            expect(e.message).toBe('No rows found in the file');
        }
    });

    it('throws 400 when required columns are missing (checks header of first row)', () => {
        const rows = [{ due_date: '2025-03-10' }];
        const pipe = new ParseAndValidateFilePipe();
        (pipe as any).parsers = [stubParser(rows)];

        try {
            pipe.transform(file as any);
            fail('should have thrown');
        } catch (e: any) {
            expect(e).toBeInstanceOf(BadRequestException);
            expect(e.message).toContain('Missing required columns:');
            expect(e.message).toContain('actual_due_date');
            expect(e.message).toContain('creation_date');
            expect(e.message).toContain('reference_date');
        }
    });

    it('accepts header alias "enddate" as end_date and normalizes dates/numbers/booleans', () => {
        const rows = [{
            due_date: '2025-03-10',
            actual_due_date: '2025-03-10',
            creation_date: '2025-02-17',
            reference_date: '2025-02-14',
            amount: '11.94',
            transaction_type_id: 4,
            abbreviated_description: 'Compra a Vista',
            is_credit: 'false',
            start_date: '2025-02-28',
            enddate: '2025-04-02',
        }];
        const pipe = new ParseAndValidateFilePipe();
        (pipe as any).parsers = [stubParser(rows)];

        const spy = jest.spyOn(classValidator, 'validateSync' as any).mockReturnValue([]);

        const { raw, formatted } = pipe.transform(file as any);

        expect(raw).toEqual(rows);
        expect(formatted).toHaveLength(1);
        expect(spy).toHaveBeenCalledTimes(1);
        const dtoPassed = spy.mock.calls[0][0];
        expect((dtoPassed as any).end_date).toBe('2025-04-02');
    });

    it('aggregates validation errors across rows and throws BadRequest with details', () => {
        const rows = [
            {
                due_date: '2025-03-10', actual_due_date: '2025-03-10', creation_date: '2025-02-17',
                reference_date: '2025-02-14', amount: 11.94, transaction_type_id: 4,
                abbreviated_description: 'Compra a Vista', is_credit: false,
                start_date: '2025-02-28', end_date: '2025-04-02',
            },
            {
                due_date: '2025-03-10', actual_due_date: '2025-03-10', creation_date: '2025-02-17',
                reference_date: 'bad-date', amount: 'NaN', transaction_type_id: 4,
                abbreviated_description: 'Compra a Vista', is_credit: 'x',
                start_date: '2025-02-28', end_date: '2025-04-02',
            },
        ];
        const pipe = new ParseAndValidateFilePipe();
        (pipe as any).parsers = [stubParser(rows)];

        const validateMock = jest.spyOn(classValidator, 'validateSync' as any)
            .mockReturnValueOnce([])
            .mockReturnValueOnce([
                { property: 'reference_date', constraints: { isDateString: 'must be a valid ISO 8601 date string' } },
                { property: 'amount', constraints: { isNumberString: 'must be a number string' } },
            ]);

        try {
            pipe.transform(file as any);
            fail('should have thrown');
        } catch (e: any) {
            expect(e).toBeInstanceOf(BadRequestException);
            expect(e.response?.message).toBe('Validation failed for one or more rows');
            expect(e.response?.statusCode).toBe(400);

            const details = e.response?.details;
            expect(Array.isArray(details)).toBe(true);
            expect(details[0].row).toBe(2);
            expect(details[0].errors).toEqual([
                'reference_date: must be a valid ISO 8601 date string',
                'amount: must be a number string',
            ]);
        }
        expect(validateMock).toHaveBeenCalledTimes(2);
    });
});
