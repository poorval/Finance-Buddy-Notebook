import api from '@/utils/api';
import { db, Transaction, Category } from '@/lib/db';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export interface IDataService {
    getTransactions(filters?: any): Promise<Transaction[]>;
    addTransaction(transaction: Omit<Transaction, 'id'>): Promise<any>;
    updateTransaction(id: number | string, transaction: Partial<Transaction>): Promise<void>;
    updateBudget(amount: number): Promise<void>;
    getStats(): Promise<any>;
    getPersonality(): Promise<any>;
    getCategories(): Promise<string[]>;
    getCategoryTotals(filters?: any): Promise<{ category: string, total: number }[]>;
    seedData(count: number): Promise<void>;
}

// --- Local Service (IndexedDB) ---
class LocalDataService implements IDataService {
    async getTransactions(filters: any = {}): Promise<Transaction[]> {
        let collection = db.transactions.orderBy('timestamp').reverse();

        // Dexie filtering is basic, so we might need in-memory filter for complex queries
        // or compound indices. For now, filter in memory after fetch if volume is okay,
        // or use direct range queries.

        // Simple implementation: Fetch all and filter (fine for <10k records usually)
        // Optimization: Use 'between' if date range is provided
        let transactions = await collection.toArray();

        if (filters.start_date) {
            const startStr = filters.start_date;
            // Assume input is YYYY-MM-DD. We want start of that day.
            // Using string comparison for ISO timestamps is safe IF we compare consistently.
            // Or better: Use Date objects.
            transactions = transactions.filter(t => {
                const tDate = new Date(t.timestamp);
                const filterStart = new Date(startStr);
                // Reset time to ensure we compare dates
                filterStart.setHours(0, 0, 0, 0);
                return tDate.getTime() >= filterStart.getTime();
            });
        }
        if (filters.end_date) {
            const endStr = filters.end_date;
            transactions = transactions.filter(t => {
                const tDate = new Date(t.timestamp);
                const filterEnd = new Date(endStr);
                // Set to end of day for inclusive filtering
                filterEnd.setHours(23, 59, 59, 999);
                return tDate.getTime() <= filterEnd.getTime();
            });
        }
        if (filters.category && filters.category !== 'all') {
            transactions = transactions.filter(t => t.category === filters.category);
        }

        return transactions;
    }

    async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<any> {
        return await db.transactions.add(transaction);
    }

    async updateTransaction(id: number | string, transaction: Partial<Transaction>): Promise<void> {
        await db.transactions.update(Number(id), transaction);
    }

    async updateBudget(amount: number): Promise<void> {
        // 'local_user' is the default key for local mode
        await db.user_settings.put({ user_id: 'local_user', monthly_budget: amount });
    }

    async getStats(): Promise<any> {
        const transactions = await db.transactions.toArray();
        const total_spent = transactions.reduce((sum, t) => sum + t.amount, 0);

        // Mock budget logic
        const settings = await db.user_settings.get('local_user'); // Default user
        const total_budget = settings?.monthly_budget || 20000; // Default

        return {
            total_spent,
            budget: total_budget,
            remaining: total_budget - total_spent,
            active_debts: 0 // Not implemented in local yet
        };
    }

    async getPersonality(): Promise<any> {
        // Basic logic mirroring backend
        const transactions = await db.transactions.toArray();
        if (!transactions.length) {
            return { title: "The Blank Slate", emoji: "📝", description: "No data yet." };
        }

        const totals: Record<string, number> = {};
        transactions.forEach(t => totals[t.category] = (totals[t.category] || 0) + t.amount);

        const topCat = Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];

        // Simple map
        const personalities: Record<string, any> = {
            "Dining": { title: "The Foodie", emoji: "🍔" },
            "Shopping": { title: "The Shopaholic", emoji: "🛍️" },
            "Transport": { title: "The Traveler", emoji: "✈️" },
            "Entertainment": { title: "The Social Butterfly", emoji: "🦋" },
            "Bills": { title: "The Responsible Adult", emoji: "💼" },
            "Investments": { title: "The Future Tycoon", emoji: "📈" }
        };

        return personalities[topCat] || { title: "The Balanced Spender", emoji: "⚖️", description: `Led by ${topCat}` };
    }

    async getCategories(): Promise<string[]> {
        const cats = await db.categories.toArray();
        if (cats.length === 0) {
            // Return defaults if empty
            return ["Dining", "Groceries", "Transport", "Entertainment", "Shopping", "Bills", "Others"];
        }
        return cats.map(c => c.name);
    }

    async getCategoryTotals(filters?: any): Promise<{ category: string, total: number }[]> {
        const transactions = await this.getTransactions(filters);
        const map = new Map<string, number>();
        transactions.forEach(t => {
            map.set(t.category, (map.get(t.category) || 0) + t.amount);
        });
        return Array.from(map.entries()).map(([category, total]) => ({ category, total }));
    }

    async seedData(count: number): Promise<void> {
        const CATEGORIES = ["Dining", "Groceries", "Transport", "Entertainment", "Shopping", "Bills", "Others", "Health", "Investments"];
        const records: Transaction[] = [];

        console.log(`Seeding ${count} records locally...`);

        for (let i = 0; i < count; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 365)); // Last 1 year
            const dateStr = format(date, 'yyyy-MM-dd HH:mm:ss');

            records.push({
                timestamp: dateStr,
                description: `Local Transaction ${i + 1}`,
                amount: Math.round(Math.random() * 500 * 100) / 100,
                category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
                user_id: 'local_user'
            });
        }

        await db.transactions.bulkAdd(records);
        console.log("Seeding complete.");
    }
}

// --- Cloud Service (API) ---
class CloudDataService implements IDataService {
    async getTransactions(filters: any): Promise<Transaction[]> {
        const params = new URLSearchParams(filters);
        const res = await api.get(`/transactions?${params.toString()}`);
        return res.data;
    }

    async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<any> {
        const res = await api.post('/transactions', transaction);
        return res.data;
    }

    async updateTransaction(id: number | string, transaction: Partial<Transaction>): Promise<void> {
        await api.put(`/transactions/${id}`, transaction);
    }

    async updateBudget(amount: number): Promise<void> {
        await api.post('/budget', { amount });
    }

    async getStats(): Promise<any> {
        const res = await api.get('/stats');
        return res.data;
    }

    async getPersonality(): Promise<any> {
        const res = await api.get('/analytics/personality');
        return res.data;
    }

    async getCategories(): Promise<string[]> {
        const res = await api.get('/insights');
        if (Array.isArray(res.data)) {
            return res.data.map((c: any) => c.category);
        }
        return [];
    }

    async getCategoryTotals(filters?: any): Promise<{ category: string, total: number }[]> {
        // Cloud calculation: Currently /insights returns ALL time totals.
        // If we want filtered totals, we'd need a backend update or client-side calc.
        // For MVP refactor, let's use client-side or existing endpoint.
        // The existing endpoint /insights is: get_category_totals().
        // It doesn't accept filters currently.
        // To support filtering, we should likely fetch transactions and aggregate client-side 
        // OR rely on the parent component to do it (which AnalyticsView does).
        // BUT, strictly complying with the interface:
        const t = await this.getTransactions(filters);
        const map = new Map<string, number>();
        t.forEach(tx => {
            map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
        });
        return Array.from(map.entries()).map(([category, total]) => ({ category, total }));
    }

    async seedData(count: number): Promise<void> {
        // Not implemented for cloud from frontend
        console.warn("Seeding cloud data from frontend is not supported yet.");
    }
}

// --- Factory / Hook ---
export const getService = (): IDataService => {
    // We can't use hooks here if this is a plain function, so we read localStorage directly.
    // If we want reactivity, we should use a Context or a Hook wrapper.
    // For simplicity, we read on every call or instantiate based on current state.

    const isBrowser = typeof window !== 'undefined';
    const mode = isBrowser ? localStorage.getItem('storage_mode') : 'local';

    if (mode === 'cloud') {
        return new CloudDataService();
    }
    return new LocalDataService();
};
