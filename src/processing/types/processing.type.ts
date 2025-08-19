export type RawLine = {
    id: UUID;
    referenceDate: string;
    description: string;
    amount: Money;
    nature: "Brasilcard" | "Fundo" | "Crédito";
    rawTypeId: number;
    raw: any;
};

export type MonthlyInvoice = {
    dueDate: string;
    startDate: string;
    endDate: string;
    lines: RawLine[];
    totals: {
        debitsBrasilcard: Money;
        debitsFundo: Money;
        credits: Money;
    };
};

export type OutputRow = {
    dueDate: string;
    amount: Money;
    date: string;
    description: string;
    ccb?: number | '';
    tipo: 'Brasil Card' | 'Fundo';
};

export type Ccb = {
    id: number;
    bornDueDate: string;
    bornAtRefDate: string;
    balance: Money;
    originActualDue?: string;
    closedAtRefDate?: string;
    closedStatus?: 'on_time' | 'late';
};


export type UUID = string;
export type Money = number;
