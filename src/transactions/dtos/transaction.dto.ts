import { IsBoolean, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class TransactionDto {
    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'due_date must be YYYY-MM-DD' })
    due_date: string;

    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'actual_due_date must be YYYY-MM-DD' })
    actual_due_date: string;

    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'creation_date must be YYYY-MM-DD' })
    creation_date: string;

    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'reference_date must be YYYY-MM-DD' })
    reference_date: string;

    @IsNumber()
    amount: number;

    @IsNumber()
    transaction_type_id: number;

    @IsString()
    abbreviated_description: string;

    @IsBoolean()
    is_credit: boolean;

    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'start_date must be YYYY-MM-DD' })
    start_date: string;

    @IsOptional()
    @IsString()
    @Matches(ISO_DATE_ONLY, { message: 'end_date must be YYYY-MM-DD' })
    end_date?: string;
}