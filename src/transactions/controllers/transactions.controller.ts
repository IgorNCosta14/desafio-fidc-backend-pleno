import { Controller, HttpStatus, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { TransactionsService } from "../services/transactions.service";
import { FileInterceptor } from "@nestjs/platform-express/multer";
import { ValidateFileExtensionInterceptor } from 'src/common/interceptors/validate-file-extension.interceptor';
import { ParseAndValidateFilePipe } from "src/common/pipes/parse-and-validate-file.pipe";

@Controller('transactions')
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

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
                inserted: transactions.length
            }
        }
    }
}