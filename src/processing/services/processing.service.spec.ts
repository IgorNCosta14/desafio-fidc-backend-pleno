import { ProcessingService } from './processing.service';

jest.mock('../../shared/utils/constants.until', () => ({
    BRASILCARD_NATURE_IDS: new Set<number>([
        4, 5,
        1613, 142, 790, 98, 9923,
        9931, 22138, 24437, 24444, 24479,
        441, 461, 9926, 30110, 30118, 22198,
        2102, 2110, 22150, 24317, 104, 431, 731, 1629,
        84, 22140,
    ]),
}));

type Tx = any;

describe('ProcessingService (unit)', () => {
    let service: ProcessingService;
    const repo = {
        saveMany: jest.fn(async (rows: any[]) => rows),
        findAll: jest.fn(async () => []),
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ProcessingService(repo);
    });

    function mkTx(partial: Partial<Tx>): Tx {
        return {
            id: partial.id ?? Math.floor(Math.random() * 1e6),
            isCredit: false,
            amount: partial.amount ?? 0,
            transactionTypeId: partial.transactionTypeId ?? 4,
            abbreviatedDescription: partial.abbreviatedDescription ?? 'C04 - Compra',
            description: partial.description,
            referenceDate: partial.referenceDate ?? '2025-03-01',
            startDate: partial.startDate ?? '2025-03-01',
            endDate: partial.endDate ?? '2025-03-31',
            dueDate: partial.dueDate ?? '2025-04-10',
            creationDate: partial.creationDate ?? '2025-03-02',
            actualDueDate: partial.actualDueDate,
            ...partial,
        };
    }

    describe('helpers', () => {
        test('addDays: valid and invalid paths', () => {
            expect(service.addDays('2025-03-10', 1)).toBe('2025-03-11');
            expect(() => service.addDays('not-a-date' as any, 1)).toThrow('Invalid date for CCB transfer date.');
        });

        test('buildMovementCode', () => {
            expect(service.buildMovementCode(undefined, true)).toBeUndefined();
            expect(service.buildMovementCode(24331, true)).toBe('A24331');
            expect(service.buildMovementCode(4, false)).toBe('C04');
            expect(service.buildMovementCode(5, false)).toBe('C05');
            expect(service.buildMovementCode(104, false)).toBe('A104');
        });

        test('extractCode', () => {
            expect(service.extractCode('A24331 - Foo')).toEqual({ code: 'A24331', text: 'Foo' });
            expect(service.extractCode('c04- compra')).toEqual({ code: 'C04', text: 'compra' });
            expect(service.extractCode('NoCode')).toEqual({ text: 'NoCode' });
            expect(service.extractCode(undefined)).toEqual({});
        });

        test('findTargetDueDateForCredit', () => {
            const dues = ['2025-03-10', '2025-04-10', '2025-05-10'];
            expect(service.findTargetDueDateForCredit('2025-03-01', dues)).toBe('2025-03-10');
            expect(service.findTargetDueDateForCredit('2025-04-15', dues)).toBe('2025-05-10');
            expect(service.findTargetDueDateForCredit('2025-06-01', dues)).toBe('2025-05-10');
        });

        test('formatting helpers', () => {
            expect(service.pad2(7)).toBe('07');
            expect(service.pad2(12)).toBe('12');
            expect(service.toMoney('123.456')).toBe(123.46);
            expect(service.round2(10.005)).toBe(10.01);
            expect(service.cmpDate('2025-01-01', '2025-01-02')).toBe(-1);
            expect(service.formatWithCode('C04', 'Compra')).toBe('C04 - Compra');
            expect(service.formatWithCode(undefined, 'Compra')).toBe('Compra');
        });

        test('getActualDueDate prefers raw.actualDueDate', () => {
            const rows: any[] = [
                { raw: {} },
                { raw: { actualDueDate: '2025-04-09' } },
            ];
            expect(service.getActualDueDate(rows as any, '2025-04-10')).toBe('2025-04-09');
            expect(service.getActualDueDate([], '2025-04-10')).toBe('2025-04-10');
        });
    });

    describe('buildOutputTable + sanitizeDebitsWhenCcbBorn', () => {
        test('creates CCB when unpaid at due and hides same-invoice Brasilcard debits; distributes Fundo across CCBs', () => {
            const invoices: any[] = [
                {
                    dueDate: '2025-03-10',
                    lines: [
                        { nature: 'Brasilcard', amount: 60, referenceDate: '2025-02-10', description: 'C04 - Compra', rawTypeId: 4, raw: {} },
                        { nature: 'Brasilcard', amount: 40, referenceDate: '2025-02-11', description: 'C05 - Parcela', rawTypeId: 5, raw: {} },
                        { nature: 'Fundo', amount: 50, referenceDate: '2025-02-12', description: 'A104 - Fundo', rawTypeId: 104, raw: {} },
                        { nature: 'Crédito', amount: -10, referenceDate: '2025-02-20', description: 'A24331Pag fatura', rawTypeId: 24331, raw: {} },
                        { nature: 'Crédito', amount: -10, referenceDate: '2025-02-21', description: 'A24331Pag fatura', rawTypeId: 24331, raw: {} },
                    ],
                },
            ];

            const rows = service.buildOutputTable(invoices);


            const ccbBorn = rows.find(r => r.tipo === 'Brasil Card' && r.description === 'CCB' && r.amount < 0);
            expect(ccbBorn).toBeTruthy();
            expect(ccbBorn!.amount).toBe(-80);

            const ccbCredit = rows.find(r => r.tipo === 'Fundo' && r.description === 'CCB' && r.amount > 0);
            expect(ccbCredit).toBeTruthy();
            expect(ccbCredit!.amount).toBe(80);
            const ccbId = ccbCredit!.ccb as number;

            const fundoAlloc = rows.find(r => r.tipo === 'Fundo' && r.amount === 50 && r.ccb === ccbId);
            expect(fundoAlloc).toBeTruthy();

            const visibleBcardDebits = rows.filter(r => r.tipo === 'Brasil Card' && r.amount > 0 && r.description !== 'CCB');
            expect(visibleBcardDebits).toHaveLength(0);
        });

        test('sanitizeDebitsWhenCcbBorn keeps rows for invoices without CCB birth', () => {
            const rows = [
                { dueDate: '2025-03-10', date: '2025-03-11', amount: -80, description: 'CCB', tipo: 'Brasil Card', ccb: '' },
                { dueDate: '2025-03-10', date: '2025-02-10', amount: 60, description: 'C04 - Compra', tipo: 'Brasil Card', ccb: '' },
                { dueDate: '2025-04-10', date: '2025-03-01', amount: 10, description: 'C04 - Compra', tipo: 'Brasil Card', ccb: '' },
            ] as any;
            const cleaned = service.sanitizeDebitsWhenCcbBorn(rows);
            expect(cleaned.find(r => r.dueDate === '2025-03-10' && r.amount > 0)).toBeUndefined();
            expect(cleaned.find(r => r.dueDate === '2025-04-10' && r.amount > 0)).toBeTruthy();
        });
    });

    describe('distributeFundoAcrossCCBs', () => {
        test('no existing CCB balance -> single Fundo row without ccb id', () => {
            const out = service.distributeFundoAcrossCCBs('2025-04-10', '2025-04-02', 'Fundo', 30, []);
            expect(out).toEqual([
                { dueDate: '2025-04-10', date: '2025-04-02', amount: 30, description: 'Fundo', tipo: 'Fundo', ccb: '' },
            ]);
        });

        test('proportional distribution and rounding, last quota as remainder', () => {
            const ledger = [
                { id: 1, bornDueDate: '2025-03-10', bornAtRefDate: '2025-03-11', originActualDue: '2025-03-10', balance: 400 },
                { id: 2, bornDueDate: '2025-04-10', bornAtRefDate: '2025-04-11', originActualDue: '2025-04-10', balance: 350 },
            ];
            const outs = service.distributeFundoAcrossCCBs('2025-05-10', '2025-05-02', 'Fundo', 300, ledger as any);
            expect(outs).toHaveLength(2);
            const first = outs.find(r => r.ccb === 1)!;
            const second = outs.find(r => r.ccb === 2)!;
            expect(first.amount + second.amount).toBe(300);
            expect((ledger as any)[0].balance).toBe(400 + first.amount);
            expect((ledger as any)[1].balance).toBe(350 + second.amount);
        });
    });

    describe('process + persistence', () => {
        test('listProcessedOutputs proxies to repository', async () => {
            (repo.findAll as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
            const rows = await service.listProcessedOutputs();
            expect(rows).toEqual([{ id: 1 }]);
        });
    });
});
