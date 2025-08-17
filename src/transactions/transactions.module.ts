import { Module } from "@nestjs/common";
import { TransactionsController } from "./controllers/transactions.controller";
import { TransactionsService } from "./services/transactions.service";
import { Transaction } from "./entities/transaction.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransactionsRepository } from "./repositories/transactions.repository";

@Module({
    imports: [TypeOrmModule.forFeature([Transaction])],
    controllers: [TransactionsController],
    providers: [TransactionsRepository, TransactionsService],
    exports: [TransactionsService],
})
export class TransactionsModule { }
