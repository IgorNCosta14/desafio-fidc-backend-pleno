import { ApiProperty } from '@nestjs/swagger';

export class UploadTransactionsDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Arquivo contendo as transações',
    })
    file!: any;
}   