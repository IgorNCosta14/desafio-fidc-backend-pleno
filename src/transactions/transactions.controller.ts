import { Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { FileInterceptor } from "@nestjs/platform-express/multer";
import { ValidateFileExtensionInterceptor } from 'src/common/interceptors/validate-file-extension.interceptor';

@Controller('transactions')
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file'),
        ValidateFileExtensionInterceptor(['xlsx'])
    )
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        return await this.transactionsService.processExcel(file.buffer);
    }
}