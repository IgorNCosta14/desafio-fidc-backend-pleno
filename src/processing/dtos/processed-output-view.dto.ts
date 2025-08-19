import { ApiProperty } from '@nestjs/swagger';

export class ProcessedOutputViewDto {
    @ApiProperty({
        example: '2025-03-10',
        description: 'Data de vencimento (due_date) da fatura a que a linha pertence (YYYY-MM-DD).'
    })
    dueDate: string;

    @ApiProperty({
        example: -86.27,
        description: 'Valor do lançamento. Débito negativo, crédito positivo.'
    })
    amount: number;

    @ApiProperty({
        example: '2025-03-11',
        description: 'Data de referência (reference_date) do lançamento (YYYY-MM-DD).'
    })
    date: string;

    @ApiProperty({
        example: 'CCB',
        description: 'Descrição normalizada do lançamento.'
    })
    description: string;

    @ApiProperty({
        example: 1,
        nullable: true,
        description: 'ID da CCB associada (quando aplicável). Null quando não houver vinculação.'
    })
    ccb: number | null;

    @ApiProperty({
        example: 'Fundo',
        enum: ['Brasil Card', 'Fundo'],
        description: 'Natureza do lançamento no resultado processado.'
    })
    tipo: 'Brasil Card' | 'Fundo';
}
