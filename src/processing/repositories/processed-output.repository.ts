import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProcessedOutput } from '../entities/processed-output.entity';
import { CreateProcessedOutputDto } from '../dtos/create-processed-output.dto';

@Injectable()
export class ProcessedOutputRepository {
    constructor(
        @InjectRepository(ProcessedOutput)
        private readonly repo: Repository<ProcessedOutput>,
    ) { }

    async findAll(): Promise<{
        dueDate: string;
        amount: number;
        date: string;
        description: string;
        ccb: number | null;
        tipo: string;
    }[]> {
        const rows = await this.repo.createQueryBuilder('po')
            .select([
                'po.dueDate AS "dueDate"',
                'po.amount AS "amount"',
                'po.date AS "date"',
                'po.description AS "description"',
                'po.ccb AS "ccb"',
                'po.tipo AS "tipo"',
            ])
            .orderBy('po.dueDate', 'ASC')
            .addOrderBy('po.date', 'ASC')
            .getRawMany();

        return rows.map((r) => ({
            ...r,
            dueDate: r.dueDate ? r.dueDate.toISOString().split('T')[0] : null,
            date: r.date ? r.date.toISOString().split('T')[0] : null,
            amount: Number(r.amount),
        }));
    }

    async saveMany(rows: CreateProcessedOutputDto[]): Promise<ProcessedOutput[]> {
        const entities = rows.map((r) => this.repo.create({
            dueDate: r.dueDate,
            amount: r.amount,
            date: r.date,
            description: r.description,
            ccb: typeof r.ccb === 'number' ? r.ccb : null,
            tipo: r.tipo
        }));
        return await this.repo.save(entities);
    }
}
