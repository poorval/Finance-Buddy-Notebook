import Dexie, { Table } from 'dexie';

export interface Transaction {
    id?: number;
    timestamp: string;
    description: string;
    amount: number;
    category: string;
    split_details?: string;
    user_id?: string;
}

export interface Category {
    id?: number;
    name: string;
    budget: number;
    user_id?: string;
}

export interface UserSettings {
    user_id: string;
    monthly_budget: number;
}

export class FinanceBuddyDB extends Dexie {
    transactions!: Table<Transaction, number>;
    categories!: Table<Category, number>;
    user_settings!: Table<UserSettings, string>;

    constructor() {
        super('FinanceBuddyDB');
        this.version(1).stores({
            transactions: '++id, timestamp, category, amount, user_id',
            categories: '++id, &name, budget, user_id',
            user_settings: 'user_id, monthly_budget'
        });
    }
}

export const db = new FinanceBuddyDB();
