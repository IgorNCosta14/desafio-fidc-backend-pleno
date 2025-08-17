import { BadRequestException, HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { FileParser } from '../file-parsers/file-parser.interface';
import { XlsxParser } from '../file-parsers/xlsx.parser';
import { TransactionDto } from 'src/transactions/dtos/transaction.dto';
import { toBooleanStrict, toIsoDateStrict, toNumberStrict } from 'src/shared/utils/normalizers.util';

@Injectable()
export class ParseAndValidateFilePipe implements PipeTransform<Express.Multer.File, { raw: any[]; formatted: TransactionDto[] }> {
    private parsers: FileParser<Record<string, any>>[];

    constructor() {
        this.parsers = [new XlsxParser()];
    }

    transform(file: Express.Multer.File): { raw: any[]; formatted: TransactionDto[] } {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        const parser = this.parsers.find((p) => p.canParse(file));

        if (!parser) {
            throw new BadRequestException('Unsupported file format');
        }

        let rawRows: Record<string, any>[];

        try {
            rawRows = parser.parse(file);
        } catch (err: any) {
            throw new BadRequestException(`Failed to parse ${parser.name} file`);
        }

        if (!Array.isArray(rawRows) || rawRows.length === 0) {
            throw new BadRequestException('No rows found in the file');
        }

        const requiredColumns = [
            'due_date',
            'actual_due_date',
            'creation_date',
            'reference_date',
            'amount',
            'transaction_type_id',
            'abbreviated_description',
            'is_credit',
            'start_date',
            'end_date'
        ];

        const headerAliases: Record<string, string[]> = {
            end_date: ['enddate'],
        };

        const hasColumn = (row: Record<string, any>, key: string) => {
            if (key in row) return true;
            const aliases = headerAliases[key];
            return Array.isArray(aliases) ? aliases.some(a => a in row) : false;
        };

        const missing = requiredColumns.filter((column) => !hasColumn(rawRows[0], column));

        if (missing.length > 0) {
            throw new BadRequestException(`Missing required columns: ${missing.join(', ')}`);
        }

        const dateFields = [
            'due_date',
            'actual_due_date',
            'creation_date',
            'reference_date',
            'start_date',
            'end_date',
            'enddate'
        ];

        const normalizedRows = rawRows.map((row) => {
            const r: Record<string, any> = { ...row };

            if (r['enddate'] !== undefined && r['end_date'] === undefined) {
                r['end_date'] = r['enddate'];
            }

            for (const key of dateFields) {
                if (r[key] !== undefined) {
                    const iso = toIsoDateStrict(r[key]);

                    if (iso) {
                        if (key === 'enddate') continue;

                        r[key] = iso;
                    }
                }
            }

            if (r['is_credit'] !== undefined) r['is_credit'] = toBooleanStrict(r['is_credit']);
            if (r['amount'] !== undefined) r['amount'] = toNumberStrict(r['amount']);

            return r;
        });

        const formatted: TransactionDto[] = [];
        const allErrors: { row: number; errors: string[] }[] = [];

        normalizedRows.forEach((row, index) => {
            const instance = plainToInstance(TransactionDto, row, {
                enableImplicitConversion: true,
                exposeUnsetFields: true,
            });

            const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: false });

            if (errors.length > 0) {
                const messages = errors.flatMap(err => {
                    const constraints = err.constraints ? Object.values(err.constraints) : ['invalid'];
                    return constraints.map(msg => `${err.property}: ${msg}`);
                });

                allErrors.push({ row: index + 1, errors: messages });
            } else {
                formatted.push(instance);
            }
        });

        if (allErrors.length > 0) {
            throw new BadRequestException({
                message: 'Validation failed for one or more rows',
                details: allErrors,
                error: 'Bad request',
                statusCode: HttpStatus.BAD_REQUEST,
            });
        }

        return { raw: rawRows, formatted };
    }
}