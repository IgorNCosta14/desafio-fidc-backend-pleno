import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'transactions' })
export class Transaction {
    @PrimaryGeneratedColumn('uuid', { name: 'id' })
    id: string;

    @Column({ type: 'date', name: 'due_date' })
    dueDate: Date;

    @Column({ type: 'date', name: 'actual_due_date' })
    actualDueDate: Date;

    @Column({ type: 'date', name: 'creation_date' })
    creationDate: Date;

    @Column({ type: 'date', name: 'reference_date' })
    referenceDate: Date;

    @Column({ type: 'numeric', precision: 14, scale: 2, name: 'amount' })
    amount: string;

    @Column({ type: 'int', name: 'transaction_type_id' })
    transactionTypeId: number;

    @Column({ type: 'varchar', length: 255, name: 'abbreviated_description' })
    abbreviatedDescription: string;

    @Column({ type: 'boolean', name: 'is_credit' })
    isCredit: boolean;

    @Column({ type: 'date', name: 'start_date' })
    startDate: Date;

    @Column({ type: 'date', name: 'end_date', nullable: true })
    endDate: Date | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;
}
