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

    async findAll(): Promise<ProcessedOutput[]> {
        return this.repo.find();
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
