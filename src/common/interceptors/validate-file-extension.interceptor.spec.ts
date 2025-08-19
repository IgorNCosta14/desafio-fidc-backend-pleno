import { BadRequestException, CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { ValidateFileExtensionInterceptor } from './validate-file-extension.interceptor';

function makeCtx(file?: Partial<Express.Multer.File>): ExecutionContext {
    const req: any = { file };
    const http: any = { getRequest: () => req };
    return {
        switchToHttp: () => http,

        getClass: () => ({} as any),
        getHandler: () => ({} as any),
        getArgs: () => [],
        getArgByIndex: () => undefined,
        getType: () => 'http',
    } as any;
}

function makeHandler<T = any>(returnValue: T): CallHandler<T> {
    return {
        handle: jest.fn(() => of(returnValue)),
    } as any;
}

describe('ValidateFileExtensionInterceptor', () => {
    it('should throw 400 when no file was uploaded', () => {
        const InterceptorClass = ValidateFileExtensionInterceptor(['.xlsx']);
        const interceptor = new InterceptorClass();

        const ctx = makeCtx(undefined);
        const handler = makeHandler('ok');

        expect(() => interceptor.intercept(ctx, handler)).toThrow(BadRequestException);
        try {
            interceptor.intercept(ctx, handler);
        } catch (e: any) {
            expect(e.message).toBe('No file was uploaded.');
        }
    });

    it('should throw 400 when extension is not allowed and list formats in message', () => {
        const InterceptorClass = ValidateFileExtensionInterceptor(['xlsx', '.csv']);
        const interceptor = new InterceptorClass();

        const ctx = makeCtx({ originalname: 'data.pdf' } as any);
        const handler = makeHandler('ok');

        expect(() => interceptor.intercept(ctx, handler)).toThrow(BadRequestException);
        try {
            interceptor.intercept(ctx, handler);
        } catch (e: any) {
            expect(e.message).toMatch(/^Invalid file format\. Allowed formats: .*/);
            expect(e.message).toContain('.xlsx');
            expect(e.message).toContain('.csv');
        }
    });

    it('should pass through when extension is allowed (case-insensitive on file name)', async () => {
        const InterceptorClass = ValidateFileExtensionInterceptor(['xlsx']);
        const interceptor = new InterceptorClass();

        const ctx = makeCtx({ originalname: 'INPUT.XLSX' } as any);
        const handler = makeHandler('next-value');

        const result$ = interceptor.intercept(ctx, handler);
        const value = await lastValueFrom(result$);

        expect(handler.handle).toHaveBeenCalledTimes(1);
        expect(value).toBe('next-value');
    });

    it('should normalize allowed list (with or without dot) and compare lowercase', async () => {
        const InterceptorClass = ValidateFileExtensionInterceptor(['.XLSX', 'Csv']);
        const interceptor = new InterceptorClass();

        const ctx1 = makeCtx({ originalname: 'file.csv' } as any);
        const ctx2 = makeCtx({ originalname: 'file.xlsx' } as any);

        await lastValueFrom(interceptor.intercept(ctx1, makeHandler('csv-ok')));
        await lastValueFrom(interceptor.intercept(ctx2, makeHandler('xlsx-ok')));
    });
});
