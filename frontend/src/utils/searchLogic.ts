import { Transaction } from "@/lib/db";

type FilterOp = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'contains';

interface SearchToken {
    type: 'filter' | 'text';
    key?: string;
    op?: FilterOp;
    value: string;
}

/**
 * Parses a Splunk-like query string into tokens.
 * Supports:
 * - key=value, key!=value
 * - key>value, key<value, key>=value, key<=value
 * - Bare words (free text search)
 * - Quotes for values with spaces (key="some value")
 */
export function parseQuery(query: string): SearchToken[] {
    const tokens: SearchToken[] = [];
    // Regex matches:
    // 1. (key)(op)(value) where value can be quoted
    // 2. OR bare words

    // Simplification: Split by space, but respect quotes? 
    // Let's use a regex to find patterns.

    const regex = /([a-zA-Z_]+)(>=|<=|!=|=|>|<)(?:"([^"]*)"|([^"\s]+))|(?:"([^"]*)"|([^"\s]+))/g;

    let match;
    while ((match = regex.exec(query)) !== null) {
        // match[0] is full match

        if (match[1]) {
            // It's a key-op-value match
            const key = match[1].toLowerCase();
            const op = match[2] as FilterOp;
            const value = match[3] || match[4]; // Quoted or unquoted
            tokens.push({ type: 'filter', key, op, value });
        } else {
            // It's a bare word
            const value = match[5] || match[6];
            if (value) {
                tokens.push({ type: 'text', value });
            }
        }
    }

    return tokens;
}

export function filterTransactions(transactions: Transaction[], query: string): Transaction[] {
    if (!query.trim()) return transactions;

    const tokens = parseQuery(query);

    return transactions.filter(t => {
        // AND logic: Transaction must match ALL tokens
        return tokens.every(token => {
            if (token.type === 'text') {
                const term = token.value.toLowerCase();
                // Search in description and category
                return t.description.toLowerCase().includes(term) ||
                    t.category.toLowerCase().includes(term);
            }

            if (token.type === 'filter' && token.key) {
                const val = token.value.toLowerCase();

                // Map short keys if needed
                let targetValue: any = '';
                let isNumber = false;

                if (token.key === 'category' || token.key === 'cat') {
                    targetValue = t.category.toLowerCase();
                } else if (token.key === 'description' || token.key === 'desc') {
                    targetValue = t.description.toLowerCase();
                } else if (token.key === 'amount' || token.key === 'amt') {
                    targetValue = t.amount;
                    isNumber = true;
                } else {
                    // Unknown key, ignore or fail? Let's ignore this token (permissive) or return false?
                    // Splunk usually strictly enforces field names. Let's try flexible.
                    return true;
                }

                if (isNumber) {
                    const numVal = parseFloat(val);
                    if (isNaN(numVal)) return true; // Invalid number query, ignore

                    switch (token.op) {
                        case '=': return targetValue === numVal;
                        case '!=': return targetValue !== numVal;
                        case '>': return targetValue > numVal;
                        case '>=': return targetValue >= numVal;
                        case '<': return targetValue < numVal;
                        case '<=': return targetValue <= numVal;
                        default: return false;
                    }
                } else {
                    // String comparison
                    switch (token.op) {
                        case '=': return targetValue === val;
                        case '!=': return targetValue !== val;
                        case 'contains': return targetValue.includes(val);
                        // >, < on strings? Maybe alphabetical? Let's skip for now.
                        default: return targetValue === val;
                    }
                }
            }
            return true;
        });
    });
}
