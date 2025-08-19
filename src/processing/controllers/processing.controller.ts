import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ProcessingService } from '../services/processing.service';
import { TransactionsService } from 'src/transactions/services/transactions.service';
import { ApiOkResponse, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { ProcessingRunResponseDto } from '../dtos/processing-run-response.dto';

@Controller('processing')
export class ProcessingController {
    constructor(
        private readonly processingService: ProcessingService,
        private readonly transactionsService: TransactionsService
    ) { }

    @Post('run')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Executa o processamento das transações',
        description:
            'Lê todas as transações armazenadas, aplica as regras de negócio do FIDC (ex.: formação e abatimento de CCBs, priorização de pagamentos, distribuição de naturezas de Fundo), persiste a saída e retorna a visão consolidada'
    })
    @ApiOkResponse({
        description: 'Processing finished successfully.',
        type: ProcessingRunResponseDto,
        schema: {
            example: {
                statusCode: 200,
                message: 'Data processed successfully!',
                data: [
                    {
                        dueDate: '2025-03-10',
                        amount: -86.27,
                        date: '2025-03-11',
                        description: 'CCB',
                        ccb: null,
                        tipo: 'Brasil Card',
                    },
                ],
            },
        },
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error.',
        schema: {
            example: {
                statusCode: 500,
                message: 'Internal server error.',
                error: 'InternalServerError',
            },
        },
    })
    async runProcessing() {
        const transactions = await this.transactionsService.getAllTransactions();

        const data = await this.processingService.processData(transactions);

        return {
            statusCode: HttpStatus.OK,
            message: 'Data processed successfully!',
            data
        };
    }
}