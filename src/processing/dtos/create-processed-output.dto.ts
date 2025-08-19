export class CreateProcessedOutputDto {
    dueDate: string;
    amount: number;
    date: string;
    description: string;
    ccb?: number | null;
    tipo: 'Brasil Card' | 'Fundo';
}