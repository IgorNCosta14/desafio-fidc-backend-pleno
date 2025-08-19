import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('processed_outputs')
export class ProcessedOutput {
    @PrimaryGeneratedColumn('uuid', { name: 'id' })
    id: string;

    @Column({ type: 'date', name: 'dueDate' })
    dueDate: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'amount' })
    amount: number;

    @Column({ type: 'date', name: 'date' })
    date: string;

    @Column({ type: 'varchar', length: 255, name: 'description' })
    description: string;

    @Column({ type: 'int', nullable: true, name: 'ccb' })
    ccb: number | null;

    @Column({ type: 'varchar', length: 50, name: 'tipo' })
    tipo: 'Brasil Card' | 'Fundo';

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;
}
