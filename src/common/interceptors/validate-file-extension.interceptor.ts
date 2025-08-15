import { BadRequestException, CallHandler, ExecutionContext, NestInterceptor, mixin } from '@nestjs/common';
import { extname } from 'path';
import { Observable } from 'rxjs';

type Allowed = string[];

export function ValidateFileExtensionInterceptor(allowed: Allowed) {
    const allowedSet = new Set(
        allowed.map(e => (e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`))
    );

    class ValidateExtInterceptor implements NestInterceptor {
        intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
            const req = context.switchToHttp().getRequest<{ file?: Express.Multer.File }>();
            const file = req.file;

            if (!file) {
                throw new BadRequestException('No file was uploaded.');
            }

            const ext = extname(file.originalname).toLowerCase();
            if (!allowedSet.has(ext)) {
                const formats = Array.from(allowedSet).join(', ');
                throw new BadRequestException(`Invalid file format. Allowed formats: ${formats}`);
            }

            return next.handle();
        }
    }

    return mixin(ValidateExtInterceptor);
}
