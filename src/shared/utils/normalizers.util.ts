export function toIsoDateStrict(value: unknown): string | null {
    if (value == null || value === '') return null;

    if (value instanceof Date && !isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'string') {
        const s = value.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

        const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
        if (m) {
            let mm = parseInt(m[1], 10);
            let dd = parseInt(m[2], 10);
            let yy = parseInt(m[3], 10);
            if (yy < 100) yy += 2000;
            if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
                const d = new Date(Date.UTC(yy, mm - 1, dd));
                return d.toISOString().slice(0, 10);
            }
        }
    }

    return null;
}

export function toBooleanStrict(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (s === 'true' || s === '1' || s === 'yes') return true;
        if (s === 'false' || s === '0' || s === 'no') return false;
    }

    return Boolean(value);
}

export function toNumberStrict(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const s = value.replace(',', '.');
        const n = parseFloat(s);
        if (!isNaN(n)) return n;
    }

    return Number(value);
}