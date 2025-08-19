import { Injectable } from '@nestjs/common';
import { BRASILCARD_NATURE_IDS } from '../../shared/utils/constants.until';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { CreateProcessedOutputDto } from '../dtos/create-processed-output.dto';
import { ProcessedOutputRepository } from '../repositories/processed-output.repository';
import { Ccb, Money, MonthlyInvoice, OutputRow, RawLine } from '../types/processing.type';

@Injectable()
export class ProcessingService {
    constructor(private readonly processedOutputRepository: ProcessedOutputRepository) { }

    processData(transactions: Transaction[]) {

        const invoices = this.buildMonthlyRaw(transactions);
        const outputTable = this.buildOutputTable(invoices);

        const saved = this.saveOutputTable(outputTable);

        return saved;
    }

    buildOutputTable(invoices: MonthlyInvoice[]): OutputRow[] {
        const ccbLedger: Ccb[] = [];
        let nextCcbId = 1;
        const out: OutputRow[] = [];

        const invs = [...invoices].sort((a, b) => this.cmpDate(a.dueDate, b.dueDate));

        for (const inv of invs) {
            const due = inv.dueDate;
            const actualDue = this.getActualDueDate(inv.lines, due);

            const transferRef = this.addDays(actualDue, 1);

            const debitsBrasil = inv.lines.filter(l => l.nature === 'Brasilcard' && l.amount > 0);
            const debitsFundo = inv.lines.filter(l => l.nature === 'Fundo' && l.amount > 0);
            const creditsAll = inv.lines
                .filter(l => l.nature === 'Crédito')
                .map(l => ({
                    ref: l.referenceDate,
                    desc: l.description || l.raw?.abbreviatedDescription || 'Crédito',
                    rawTypeId: l.rawTypeId,
                    amount: this.round2(-l.amount),
                }))
                .sort((a, b) => this.cmpDate(a.ref, b.ref));
            const earliestBorn = ccbLedger.length
                ? ccbLedger.map(c => c.bornAtRefDate).sort(this.cmpDate)[0]
                : undefined;

            let creditsForCCB: typeof creditsAll = [];
            let creditsNoCCB: typeof creditsAll = [];

            if (!earliestBorn) {
                creditsNoCCB = creditsAll;
            } else {
                creditsForCCB = creditsAll.filter(c => this.cmpDate(c.ref, earliestBorn) >= 0);
                creditsNoCCB = creditsAll.filter(c => this.cmpDate(c.ref, earliestBorn) < 0);
            }

            for (const c of creditsNoCCB) {
                const desc = this.normalizeDescription({
                    isCredit: true,
                    rawAbbrev: c.desc,
                    rawTypeId: c.rawTypeId,
                });
                out.push(this.toOutRow(due, -c.amount, c.ref, desc, 'Brasil Card'));
            }

            const totalBrasil = this.round2(this.sum(debitsBrasil, x => x.amount));
            const paidOnTime = this.round2(this.sum(creditsNoCCB, x => x.amount));
            const unpaidAtDue = Math.max(0, this.round2(totalBrasil - paidOnTime));

            if (unpaidAtDue > 0) {
                out.push(this.toOutRow(
                    due,
                    -unpaidAtDue,
                    transferRef,
                    this.normalizeDescription({ fallback: 'CCB', tipo: 'Brasil Card' }),
                    'Brasil Card'
                ));

                const createdId = nextCcbId++;

                ccbLedger.push({
                    id: createdId,
                    bornDueDate: due,
                    bornAtRefDate: transferRef,
                    originActualDue: actualDue,
                    balance: unpaidAtDue
                });

                out.push(this.toOutRow(
                    due,
                    unpaidAtDue,
                    transferRef,
                    this.normalizeDescription({ fallback: 'CCB', tipo: 'Fundo', ccbId: createdId }),
                    'Fundo',
                    createdId
                ));
            }

            let shouldHideDebitsThisInvoice = unpaidAtDue > 0;
            if (!shouldHideDebitsThisInvoice) {
                for (const d of debitsBrasil.sort((a, b) => this.cmpDate(a.referenceDate, b.referenceDate))) {
                    const desc = this.normalizeDescription({
                        rawAbbrev: d.description || d.raw?.abbreviatedDescription || 'Débito'
                    });
                    out.push(this.toOutRow(due, d.amount, d.referenceDate, desc, 'Brasil Card'));
                }
            }

            if (unpaidAtDue === 0 && totalBrasil > 0) {
                const createdId = nextCcbId++;
                ccbLedger.push({
                    id: createdId,
                    bornDueDate: due,
                    bornAtRefDate: transferRef,
                    originActualDue: actualDue,
                    balance: totalBrasil
                });

                out.push(this.toOutRow(
                    due,
                    totalBrasil,
                    transferRef,
                    this.normalizeDescription({ fallback: 'CCB', tipo: 'Fundo', ccbId: createdId }),
                    'Fundo',
                    createdId
                ));
                out.push(this.toOutRow(
                    due,
                    -totalBrasil,
                    transferRef,
                    this.normalizeDescription({ fallback: 'CCB', tipo: 'Brasil Card' }),
                    'Brasil Card'
                ));
                shouldHideDebitsThisInvoice = true;
            }

            for (const f of debitsFundo.sort((a, b) => this.cmpDate(a.referenceDate, b.referenceDate))) {
                out.push(...this.distributeFundoAcrossCCBs(
                    due,
                    f.referenceDate,
                    this.normalizeDescription({
                        rawAbbrev: f.description || f.raw?.abbreviatedDescription || 'Fundo'
                    }),
                    f.amount,
                    ccbLedger
                ));
            }

            for (const c of creditsForCCB) {
                const prettyDesc = this.normalizeDescription({
                    isCredit: true,
                    rawAbbrev: c.desc,
                    rawTypeId: c.rawTypeId,
                });
                const eligible = ccbLedger
                    .filter(ccb => this.cmpDate(ccb.bornAtRefDate, c.ref) <= 0)
                    .sort((a, b) => this.cmpDate(a.bornAtRefDate, b.bornAtRefDate));

                let remaining = this.round2(c.amount);

                for (const ccb of eligible) {
                    if (remaining <= 0) break;
                    const pay = Math.min(remaining, Math.max(ccb.balance, 0));
                    if (pay > 0) {
                        out.push(this.toOutRow(
                            ccb.bornDueDate,
                            -pay,
                            c.ref,
                            prettyDesc,
                            'Fundo',
                            ccb.id
                        ));
                        ccb.balance = this.round2(ccb.balance - pay);
                        remaining = this.round2(remaining - pay);
                    }
                }

                if (remaining > 0) {
                    out.push(this.toOutRow(due, -remaining, c.ref, prettyDesc, 'Brasil Card'));
                }
            }

        }

        out.sort((a, b) => {
            const c1 = this.cmpDate(a.dueDate, b.dueDate);
            if (c1 !== 0) return c1;
            const c2 = this.cmpDate(a.date, b.date);
            if (c2 !== 0) return c2;
            return a.amount - b.amount;
        });

        return this.sanitizeDebitsWhenCcbBorn(out);
    }

    buildMonthlyRaw(transactions: any[]): MonthlyInvoice[] {
        const byDue = new Map<string, any[]>();
        for (const t of transactions) {
            const key = String(t.dueDate);
            if (!byDue.has(key)) byDue.set(key, []);
            byDue.get(key)!.push(t);
        }

        const dueDates = Array.from(byDue.keys()).sort(this.cmpDate);

        const invoicesMap = new Map<string, MonthlyInvoice>();
        for (const due of dueDates) {
            const txs = byDue.get(due)!;

            const startDate = txs.reduce(
                (min, t) => (min === "" || String(t.startDate) < min ? String(t.startDate) : min),
                ""
            );
            const endDate = txs.reduce(
                (max, t) => (max === "" || String(t.endDate) > max ? String(t.endDate) : max),
                ""
            );

            const lines: RawLine[] = [];

            for (const t of txs) {
                if (t.isCredit) continue;
                const amt = this.toMoney(t.amount);
                const nature: "Brasilcard" | "Fundo" =
                    BRASILCARD_NATURE_IDS.has(t.transactionTypeId) ? "Brasilcard" : "Fundo";

                lines.push({
                    id: t.id,
                    referenceDate: String(t.referenceDate),
                    description: this.normalizeDescription({
                        rawAbbrev: t.abbreviatedDescription,
                        rawTypeId: t.transactionTypeId,
                        tipo: nature === "Brasilcard" ? "Brasil Card" : "Fundo",
                    }),
                    amount: amt,
                    nature,
                    rawTypeId: t.transactionTypeId,
                    raw: t
                });
            }

            invoicesMap.set(due, {
                dueDate: due,
                startDate,
                endDate,
                lines,
                totals: { debitsBrasilcard: 0, debitsFundo: 0, credits: 0 }
            });
        }

        for (const t of transactions) {
            if (!t.isCredit) continue;
            const ref = String(t.referenceDate);
            const targetDue = this.findTargetDueDateForCredit(ref, dueDates);
            if (!targetDue) continue;

            const inv = invoicesMap.get(targetDue);
            if (!inv) continue;

            const amt = this.toMoney(t.amount);
            inv.lines.push({
                id: t.id,
                referenceDate: ref,
                description: this.normalizeDescription({
                    isCredit: true,
                    rawAbbrev: t.abbreviatedDescription,
                    rawTypeId: t.transactionTypeId,
                }),
                amount: -amt,
                nature: "Crédito",
                rawTypeId: t.transactionTypeId,
                raw: t
            });
        }

        const invoices = Array.from(invoicesMap.values())
            .sort((a, b) => this.cmpDate(a.dueDate, b.dueDate))
            .map(inv => {
                inv.lines.sort((a, b) => this.cmpDate(a.referenceDate, b.referenceDate) || a.amount - b.amount);

                const debitsBrasilcard = this.round2(
                    inv.lines.filter(l => l.nature === "Brasilcard" && l.amount > 0)
                        .reduce((s, l) => s + l.amount, 0)
                );
                const debitsFundo = this.round2(
                    inv.lines.filter(l => l.nature === "Fundo" && l.amount > 0)
                        .reduce((s, l) => s + l.amount, 0)
                );
                const creditsPositive = this.round2(
                    -inv.lines.filter(l => l.nature === "Crédito")
                        .reduce((s, l) => s + l.amount, 0)
                );

                inv.totals = { debitsBrasilcard, debitsFundo, credits: creditsPositive };
                return inv;
            });

        return invoices;
    }

    sanitizeDebitsWhenCcbBorn(rows: OutputRow[]): OutputRow[] {
        const byDue = new Map<string, OutputRow[]>();
        for (const r of rows) {
            if (!byDue.has(r.dueDate)) byDue.set(r.dueDate, []);
            byDue.get(r.dueDate)!.push(r);
        }

        const cleaned: OutputRow[] = [];

        for (const [due, list] of byDue.entries()) {
            const ccbBornHere = list.some(
                r => r.tipo === 'Brasil Card' && r.description === 'CCB' && r.amount < 0
            );

            if (!ccbBornHere) {
                cleaned.push(...list);
                continue;
            }

            for (const r of list) {
                const isBrasilcardDebit = r.tipo === 'Brasil Card'
                    && r.amount > 0
                    && r.description !== 'CCB';

                if (!isBrasilcardDebit) cleaned.push(r);
            }
        }

        cleaned.sort((a, b) => {
            const c1 = this.cmpDate(a.dueDate, b.dueDate);
            if (c1 !== 0) return c1;
            const c2 = this.cmpDate(a.date, b.date);
            if (c2 !== 0) return c2;
            return a.amount - b.amount;
        });

        return cleaned;
    }

    normalizeDescription(opts: {
        rawAbbrev?: string;
        isCredit?: boolean;
        tipo?: "Brasil Card" | "Fundo";
        ccbId?: number;
        fallback?: string;
        rawTypeId?: number;
    }): string {
        const { rawAbbrev, isCredit, tipo, fallback, rawTypeId } = opts;


        if (fallback === "CCB") return "CCB";

        if (isCredit) {
            const code = this.buildMovementCode(rawTypeId, true);
            const base = "Pag fatura cartão de crédito";
            return (code ? `${code}${base}` : base);
        }

        if (tipo === "Brasil Card") {
            const code = this.buildMovementCode(rawTypeId, false);
            const { text } = this.extractCode(rawAbbrev);
            const pretty = this.titleCaseKeepAcronyms(text || fallback || "");
            return code ? `${code} - ${pretty}` : pretty;
        }

        const { code, text } = this.extractCode(rawAbbrev);
        const pretty = this.titleCaseKeepAcronyms(text || fallback || "");
        return this.formatWithCode(code, pretty);
    }

    findTargetDueDateForCredit(ref: string, orderedDueDates: string[]): string | undefined {
        if (orderedDueDates.length === 0) return undefined;

        let lo = 0, hi = orderedDueDates.length - 1, ans = -1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (orderedDueDates[mid] >= ref) {
                ans = mid;
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        }
        if (ans !== -1) return orderedDueDates[ans];
        return orderedDueDates[orderedDueDates.length - 1];
    }

    addDays(dateISO: string, days: number): string {
        const d = new Date(dateISO + 'T00:00:00Z');
        if (isNaN(d.getTime())) throw new Error('Invalid date for CCB transfer date.');
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
    }

    distributeFundoAcrossCCBs(
        due: string,
        ref: string,
        desc: string,
        amount: Money,
        ledger: Ccb[]
    ): OutputRow[] {
        const totalSaldo = this.round2(this.sum(ledger, (c) => Math.max(c.balance, 0)));
        if (totalSaldo <= 0) {
            return [this.toOutRow(due, amount, ref, desc, 'Fundo')];
        }

        let restante = amount;
        const outs: OutputRow[] = [];
        const lastIdx = ledger.length - 1;

        ledger.forEach((ccb, i) => {
            const quota =
                i === lastIdx
                    ? this.round2(restante)
                    : this.round2((amount * ccb.balance) / totalSaldo);

            if (quota > 0) {
                outs.push(this.toOutRow(due, quota, ref, desc, 'Fundo', ccb.id));
                ccb.balance = this.round2(ccb.balance + quota);
                restante = this.round2(restante - quota);
            }
        });

        return outs;
    }

    getActualDueDate(lines: RawLine[], fallbackDueDate: string): string {
        for (const l of lines) {
            const ad = l.raw?.actualDueDate;
            if (ad) return String(ad);
        }
        return fallbackDueDate;
    }

    toOutRow(
        due: string,
        amount: number,
        ref: string,
        desc: string,
        tipo: 'Brasil Card' | 'Fundo',
        ccb?: number
    ): OutputRow {
        return {
            dueDate: due,
            amount: this.round2(amount),
            date: ref,
            description: desc,
            ccb: ccb ?? '',
            tipo: tipo,
        };
    }

    buildMovementCode(rawTypeId?: number, isCredit?: boolean): string | undefined {
        if (rawTypeId == null) return undefined;
        if (isCredit) return `A${rawTypeId}`;
        if (rawTypeId === 4 || rawTypeId === 5) {
            return `C${this.pad2(rawTypeId)}`;
        }
        return `A${rawTypeId}`;
    }

    sum<T>(arr: T[], f: (x: T) => number): number {
        return this.round2(arr.reduce((s, x) => s + f(x), 0));
    }

    pad2(n: number): string {
        return n < 10 ? `0${n}` : String(n);
    }

    toMoney(s: string | number): Money {
        const n = typeof s === "number" ? s : Number.parseFloat(s);
        return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
    }

    round2(n: number): number {
        return Math.round(n * 100) / 100;
    }

    cmpDate(a: string, b: string) {
        return a < b ? -1 : a > b ? 1 : 0;
    }

    extractCode(desc?: string): { code?: string; text?: string } {
        if (!desc) return {};
        const s = String(desc).trim();
        const m = s.match(/^([A-Z]{1,2}\d{2,5})\s*[-]?\s*(.*)$/i);
        if (m) {
            const code = m[1].toUpperCase();
            const text = (m[2] || "").trim();
            return { code, text };
        }
        return { text: s };
    }

    titleCaseKeepAcronyms(s: string): string {
        if (!s) return s;
        return s
            .split(/\s+/)
            .map(w => {
                if (/^[A-Z]{2,}$/.test(w)) return w;
                if (/^(de|da|do|das|dos|e|sem|com|a|o|as|os)$/i.test(w)) return w.toLowerCase();
                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            })
            .join(" ");
    }

    formatWithCode(code?: string, text?: string): string {
        const t = (text || "").replace(/\s+/g, " ").trim();
        if (code && t) return `${code} - ${t}`;
        if (code) return code;
        return t;
    }

    async saveOutputTable(outputTable: OutputRow[]) {
        const payload: CreateProcessedOutputDto[] = outputTable.map((r) => ({
            dueDate: r.dueDate,
            amount: r.amount,
            date: r.date,
            description: r.description,
            ccb: typeof r.ccb === 'number' ? r.ccb : null,
            tipo: r.tipo,
        }));

        return this.processedOutputRepository.saveMany(payload);
    }

    async listProcessedOutputs() {
        return this.processedOutputRepository.findAll();
    }
}
