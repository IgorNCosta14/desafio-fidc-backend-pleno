import { Module } from "@nestjs/common";
import { TransactionsModule } from "src/transactions/transactions.module";
import { ProcessingController } from "./controllers/processing.controller";
import { ProcessingService } from "./services/processing.service";
import { ProcessedOutput } from "./entities/processed-output.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProcessedOutputRepository } from "./repositories/processed-output.repository";

@Module({
    imports: [TypeOrmModule.forFeature([ProcessedOutput]), TransactionsModule],
    controllers: [ProcessingController],
    providers: [ProcessingService, ProcessedOutputRepository],
})

export class ProcessingModule { }
