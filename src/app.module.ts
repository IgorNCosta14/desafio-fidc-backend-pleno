import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('DB_HOST'),
        port: cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('DB_USERNAME'),
        password: cfg.get<string>('DB_PASSWORD'),
        database: cfg.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: false,
        ssl: cfg.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        namingStrategy: undefined,
        logging: ['error', 'schema'],
      }),
    }),
    TransactionsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
