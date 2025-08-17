import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';
import { TransactionDto } from '../dtos/transaction.dto';
import { TransactionsRepository } from '../repositories/transactions.repository';

function dateOnlyToUTC(dateStr: string | undefined | null): Date | null {
    if (!dateStr) return null;

    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function amountToDbString(n: number): string {
    return n.toFixed(2);
}

@Injectable()
export class TransactionsService {
    constructor(private readonly transactionsRepository: TransactionsRepository) { }

    async saveRawValidatedData(rows: TransactionDto[]): Promise<Transaction[]> {
        try {
            const entities: Partial<Transaction>[] = rows.map((row) => ({
                dueDate: dateOnlyToUTC(row.due_date)!,
                actualDueDate: dateOnlyToUTC(row.actual_due_date)!,
                creationDate: dateOnlyToUTC(row.creation_date)!,
                referenceDate: dateOnlyToUTC(row.reference_date)!,
                amount: amountToDbString(row.amount),
                transactionTypeId: row.transaction_type_id,
                abbreviatedDescription: row.abbreviated_description,
                isCredit: row.is_credit,
                startDate: dateOnlyToUTC(row.start_date)!,
                endDate: dateOnlyToUTC(row.end_date ?? null)
            }));

            const saved = await this.transactionsRepository.saveMany(entities);

            return saved;
        } catch (err) {
            throw new InternalServerErrorException('Failed to persist transactions');
        }
    }
}