import {
    toIsoDateStrict,
    toBooleanStrict,
    toNumberStrict,
} from './normalizers.util';

describe('normalizers.util', () => {
    describe('toIsoDateStrict', () => {
        it('returns null for nullish and empty string', () => {
            expect(toIsoDateStrict(null as any)).toBeNull();
            expect(toIsoDateStrict(undefined as any)).toBeNull();
            expect(toIsoDateStrict('')).toBeNull();
        });

        it('accepts valid Date instances (UTC slice)', () => {
            const d = new Date(Date.UTC(2025, 3, 5, 12, 34, 56));
            expect(toIsoDateStrict(d)).toBe('2025-04-05');
        });

        it('accepts ISO yyyy-mm-dd strings (trims whitespace)', () => {
            expect(toIsoDateStrict('2025-03-10')).toBe('2025-03-10');
            expect(toIsoDateStrict(' 2025-03-10 ')).toBe('2025-03-10');
        });

        it('accepts mm/dd/yy and mm/dd/yyyy formats and normalizes to yyyy-mm-dd', () => {
            expect(toIsoDateStrict('1/2/25')).toBe('2025-01-02');
            expect(toIsoDateStrict('02/29/2024')).toBe('2024-02-29');
            expect(toIsoDateStrict('03/07/2025')).toBe('2025-03-07');
        });

        it('rejects invalid month/day ranges and unsupported separators (parser expects MM/DD)', () => {
            expect(toIsoDateStrict('13/01/2025')).toBeNull();
            expect(toIsoDateStrict('00/10/2025')).toBeNull();
            expect(toIsoDateStrict('12/00/2025')).toBeNull();
            expect(toIsoDateStrict('2025/03/10')).toBeNull();
            expect(toIsoDateStrict('2025-3-1')).toBeNull();
        });

        it('rejects non-parseable types/strings', () => {
            expect(toIsoDateStrict({} as any)).toBeNull();
            expect(toIsoDateStrict('not-a-date')).toBeNull();
        });
    });

    describe('toBooleanStrict', () => {
        it('passes through booleans', () => {
            expect(toBooleanStrict(true)).toBe(true);
            expect(toBooleanStrict(false)).toBe(false);
        });

        it('accepts number 1/0 (others are false)', () => {
            expect(toBooleanStrict(1)).toBe(true);
            expect(toBooleanStrict(0)).toBe(false);
            expect(toBooleanStrict(2)).toBe(false);
            expect(toBooleanStrict(-1)).toBe(false);
        });

        it('accepts canonical strings (case/space insensitive)', () => {
            expect(toBooleanStrict('true')).toBe(true);
            expect(toBooleanStrict('TRUE')).toBe(true);
            expect(toBooleanStrict('  yes  ')).toBe(true);
            expect(toBooleanStrict('1')).toBe(true);

            expect(toBooleanStrict('false')).toBe(false);
            expect(toBooleanStrict('FALSE')).toBe(false);
            expect(toBooleanStrict(' no ')).toBe(false);
            expect(toBooleanStrict('0')).toBe(false);
        });

        it('falls back to JS truthiness for other values', () => {
            expect(toBooleanStrict('maybe')).toBe(true);
            expect(toBooleanStrict('   ')).toBe(true);
            expect(toBooleanStrict('')).toBe(false);
            expect(toBooleanStrict(null)).toBe(false);
            expect(toBooleanStrict(undefined)).toBe(false);
            expect(toBooleanStrict({})).toBe(true);
            expect(toBooleanStrict([])).toBe(true);
        });
    });

    describe('toNumberStrict', () => {
        it('passes through numbers', () => {
            expect(toNumberStrict(1.23)).toBe(1.23);
            expect(toNumberStrict(0)).toBe(0);
            expect(toNumberStrict(-5)).toBe(-5);
        });

        it('parses strings with comma or dot', () => {
            expect(toNumberStrict('1,23')).toBe(1.23);
            expect(toNumberStrict('2.5')).toBe(2.5);
            expect(toNumberStrict('  3,50  ')).toBe(3.5);
        });

        it('returns Number(value) when parseFloat after replace fails', () => {
            expect(Number.isNaN(toNumberStrict('NaN'))).toBe(true);
            expect(toNumberStrict('')).toBe(0);
            expect(toNumberStrict('   ')).toBe(0);
            expect(Number.isNaN(toNumberStrict('abc'))).toBe(true);
        });

        it('handles mixed inputs reasonably', () => {
            expect(toNumberStrict('1.234,56')).toBe(1.234);
        });
    });
});
