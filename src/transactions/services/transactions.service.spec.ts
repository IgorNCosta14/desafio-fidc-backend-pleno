import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { TransactionDto } from '../dtos/transaction.dto';
import { Transaction } from '../entities/transaction.entity';

describe('TransactionsService', () => {
    let service: TransactionsService;
    let repo: jest.Mocked<TransactionsRepository>;

    const makeDate = (y: number, m: number, d: number) => new Date(y, m - 1, d);

    beforeEach(async () => {
        const repoMock: jest.Mocked<TransactionsRepository> = {
            saveMany: jest.fn(),
            getAll: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionsService,
                { provide: TransactionsRepository, useValue: repoMock },
            ],
        }).compile();

        service = module.get<TransactionsService>(TransactionsService);
        repo = module.get(TransactionsRepository);
    });

    describe('saveRawValidatedData', () => {
        it('should map DTO rows to entities and call repository.saveMany', async () => {
            const rows: TransactionDto[] = [
                {
                    due_date: '2025-03-10',
                    actual_due_date: '2025-03-10',
                    creation_date: '2025-02-17',
                    reference_date: '2025-02-14',
                    amount: 11.94,
                    transaction_type_id: 4,
                    abbreviated_description: 'Compra a Vista',
                    is_credit: false,
                    start_date: '2025-02-28',
                    end_date: '2025-04-02',
                },
                {
                    due_date: '2025-03-10',
                    actual_due_date: '2025-03-10',
                    creation_date: '2025-02-17',
                    reference_date: '2025-02-15',
                    amount: 10,
                    transaction_type_id: 5,
                    abbreviated_description: 'Parcela Lojista Visa',
                    is_credit: false,
                    start_date: '2025-02-28',
                    end_date: undefined,
                },
            ];

            // retorna o mesmo que recebeu (com ids simulados) para facilitar as asserções
            repo.saveMany.mockImplementation(async (entities: any[]) => {
                // asserções no payload que o service enviou para o repo
                expect(entities).toHaveLength(2);

                expect(entities[0]).toMatchObject({
                    amount: '11.94',
                    transactionTypeId: 4,
                    abbreviatedDescription: 'Compra a Vista',
                    isCredit: false,
                });
                expect(entities[0].dueDate).toEqual(new Date(2025, 2, 10));      // mês-1
                expect(entities[0].actualDueDate).toEqual(new Date(2025, 2, 10));
                expect(entities[0].creationDate).toEqual(new Date(2025, 1, 17));
                expect(entities[0].referenceDate).toEqual(new Date(2025, 1, 14));
                expect(entities[0].startDate).toEqual(new Date(2025, 1, 28));
                expect(entities[0].endDate).toEqual(new Date(2025, 3, 2));

                expect(entities[1]).toMatchObject({
                    amount: '10.00',
                    transactionTypeId: 5,
                    abbreviatedDescription: 'Parcela Lojista Visa',
                    isCredit: false,
                });
                expect(entities[1].endDate).toBeNull();

                // simula retorno do repositório como Transaction[]
                return entities.map((e, i) => ({ id: `t${i + 1}`, ...e })) as any;
            });

            const result = await service.saveRawValidatedData(rows);

            expect(repo.saveMany).toHaveBeenCalledTimes(1);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('t1');
            expect(result[1].id).toBe('t2');
        });

        it('should round amount to 2 decimals as string', async () => {
            const rows: TransactionDto[] = [
                {
                    due_date: '2025-01-01',
                    actual_due_date: '2025-01-01',
                    creation_date: '2024-12-28',
                    reference_date: '2024-12-28',
                    amount: 1.235,
                    transaction_type_id: 104,
                    abbreviated_description: 'Utilizacao Cartao de Credito',
                    is_credit: false,
                    start_date: '2024-12-29',
                    end_date: '2025-01-28',
                },
            ];

            repo.saveMany.mockImplementation(async (entities: Partial<Transaction>[]) => {
                expect(entities[0].amount).toBe('1.24');
                return entities as Transaction[];
            });

            await service.saveRawValidatedData(rows);
        });

        it('should throw InternalServerErrorException when repository fails', async () => {
            const rows: TransactionDto[] = [
                {
                    due_date: '2025-01-10',
                    actual_due_date: '2025-01-10',
                    creation_date: '2024-12-31',
                    reference_date: '2024-12-31',
                    amount: 50,
                    transaction_type_id: 4,
                    abbreviated_description: 'Compra a Vista',
                    is_credit: false,
                    start_date: '2024-12-29',
                    end_date: '2025-01-28',
                },
            ];

            repo.saveMany.mockRejectedValue(new Error('db down'));

            await expect(service.saveRawValidatedData(rows)).rejects.toEqual(
                new InternalServerErrorException('Failed to save transactions'),
            );
        });
    });
});
