import { Controller, HttpStatus, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { TransactionsService } from "../services/transactions.service";
import { FileInterceptor } from "@nestjs/platform-express/multer";
import { ValidateFileExtensionInterceptor } from 'src/common/interceptors/validate-file-extension.interceptor';
import { ParseAndValidateFilePipe } from "src/common/pipes/parse-and-validate-file.pipe";
import { ApiBadRequestResponse, ApiBody, ApiConsumes, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UploadTransactionsDto } from "../dtos/upload-transactions.dto";

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
    constructor(
        private readonly transactionsService: TransactionsService
    ) { }

    @Post('upload')
    @ApiOperation({
        summary:
            'Upload de transações (arquivo de dados brutos — atualmente XLSX)',
        description:
            'Endpoint para receber um arquivo de **dados brutos**, realizar **parse**, **normalização** e **validação** linha a linha, e então persistir as transações no banco. A arquitetura foi desenhada para ser **extensível** a outros formatos (ex.: CSV, JSON) por meio de parsers adicionais; **por ora, apenas .xlsx é suportado**.'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Arquivo contendo as transações a serem importadas.',
        type: UploadTransactionsDto,
        required: true,
    })
    @ApiCreatedResponse({
        description:
            'Transações salvas com sucesso.',
        schema: {
            example: {
                statusCode: 201,
                message: 'Transactions saved successfully',
                data: {
                    inserted: 2,
                    transactions: [
                        {
                            id: 1,
                            dueDate: '2025-08-01T00:00:00.000Z',
                            actualDueDate: '2025-08-01T00:00:00.000Z',
                            creationDate: '2025-07-20T00:00:00.000Z',
                            referenceDate: '2025-07-31T00:00:00.000Z',
                            amount: '1234.56',
                            transactionTypeId: 10,
                            abbreviatedDescription: 'ABC',
                            isCredit: true,
                            startDate: '2025-07-01T00:00:00.000Z',
                            endDate: '2025-12-31T00:00:00.000Z',
                            // ...demais campos/relacionamentos da sua entidade
                        },
                    ],
                },
            },
        },
    })
    @ApiBadRequestResponse({
        description: 'Erros de validação do arquivo/lotes.',
        content: {
            'application/json': {
                examples: {
                    noFile: {
                        summary: 'Nenhum arquivo enviado',
                        value: {
                            statusCode: 400,
                            message: 'No file was uploaded.',
                            error: 'Bad Request',
                        },
                    },
                    invalidFormat: {
                        summary: 'Extensão inválida',
                        value: {
                            statusCode: 400,
                            message: 'Invalid file format. Allowed formats: .xlsx',
                            error: 'Bad Request',
                        },
                    },
                    unsupported: {
                        summary: 'Formato não suportado pelo parser',
                        value: {
                            statusCode: 400,
                            message: 'Unsupported file format',
                            error: 'Bad Request',
                        },
                    },
                    emptyRows: {
                        summary: 'Nenhuma linha válida encontrada',
                        value: {
                            statusCode: 400,
                            message: 'No rows found in the file',
                            error: 'Bad Request',
                        },
                    },
                    rowValidation: {
                        summary: 'Erros de validação por linha',
                        value: {
                            statusCode: 400,
                            message: 'Validation failed for one or more rows',
                            error: 'Bad request',
                            details: [
                                {
                                    row: 2,
                                    errors: [
                                        'due_date: must be a valid ISO 8601 date string',
                                        'amount: must be a number string',
                                    ],
                                },
                                {
                                    row: 5,
                                    errors: ['is_credit: must be a boolean value'],
                                },
                            ],
                        },
                    },
                    missingColumns: {
                        summary: 'Colunas obrigatórias ausentes',
                        value: {
                            statusCode: 400,
                            message:
                                'Missing required columns: due_date, amount, transaction_type_id',
                            error: 'Bad Request',
                        },
                    },
                },
            },
        },
    })

    @ApiInternalServerErrorResponse({
        description: 'Falha interna ao salvar as transações.',
        content: {
            'application/json': {
                examples: {
                    persistError: {
                        summary: 'Erro ao salvar no banco',
                        value: {
                            statusCode: 500,
                            message: 'Failed to save transactions',
                            error: 'Internal Server Error',
                        },
                    },
                },
            },
        },
    })
    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file'),
        ValidateFileExtensionInterceptor(['xlsx'])
    )
    async uploadFile(
        @UploadedFile(new ParseAndValidateFilePipe())
        parsed: { raw: any[]; formatted: any[] }
    ) {
        const transactions = await this.transactionsService.saveRawValidatedData(parsed.formatted);

        return {
            statusCode: HttpStatus.CREATED,
            message: 'Transactions saved successfully',
            data: {
                inserted: transactions.length,
                transactions
            }
        }
    }
}