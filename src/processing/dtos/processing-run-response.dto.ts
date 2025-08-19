import { ApiProperty } from '@nestjs/swagger';
import { ProcessedOutputViewDto } from './processed-output-view.dto';

export class ProcessingRunResponseDto {
    @ApiProperty({
        example: 200,
        description: 'HTTP status code.'
    })
    statusCode: number;

    @ApiProperty({
        example: 'Data processed successfully!',
        description: 'Mensagem de sucesso (em inglês).'
    })
    message: string;

    @ApiProperty({
        type: [ProcessedOutputViewDto],
        description: 'Lista consolidada de lançamentos processados e persistidos.'
    })
    data: ProcessedOutputViewDto[];
}
