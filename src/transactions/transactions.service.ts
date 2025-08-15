import { Injectable } from "@nestjs/common";
import { ExcelParserUtil } from '../shared/utils/excel-parser.util';

@Injectable()
export class TransactionsService {
    async processExcel(buffer: Buffer) {
        const json = ExcelParserUtil.parse(buffer);

        return json;
    }
}