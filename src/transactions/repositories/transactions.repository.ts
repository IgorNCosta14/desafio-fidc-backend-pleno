import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';

@Injectable()
export class TransactionsRepository {
    constructor(
        @InjectRepository(Transaction)
        private readonly repo: Repository<Transaction>,
    ) { }

    async saveMany(items: Partial<Transaction>[]): Promise<Transaction[]> {
        return await this.repo.manager.transaction(async (manager) => {
            const repo = manager.getRepository(Transaction);

            return await repo.save(items, { chunk: 500 });
        });
    }
}
