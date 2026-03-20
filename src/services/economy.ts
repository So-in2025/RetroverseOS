import { storage } from './storage';

export interface Transaction {
  id: string;
  amount: number;
  type: 'earn' | 'spend';
  reason: string;
  timestamp: number;
}

class EconomyService {
  private balance: number = 0;
  private transactions: Transaction[] = [];
  private listeners: Set<(balance: number) => void> = new Set();

  async init() {
    this.balance = await storage.getCredits();
    const savedTransactions = await storage.getSetting('retro_coins_transactions');
    this.transactions = savedTransactions || [];
  }

  getBalance(): number {
    return this.balance;
  }

  getTransactions(): Transaction[] {
    return this.transactions;
  }

  async addCoins(amount: number, reason: string) {
    if (amount <= 0) return;
    
    this.balance = await storage.addCredits(amount);
    
    this.addTransaction({
      id: crypto.randomUUID(),
      amount,
      type: 'earn',
      reason,
      timestamp: Date.now()
    });

    await this.saveTransactions();
    this.notifyListeners();

    if (this.balance >= 5000) {
      // We need to import achievements at the top
      import('./achievements').then(({ achievements }) => {
        achievements.unlock('capitalist');
      });
    }
  }

  async spendCoins(amount: number, reason: string): Promise<boolean> {
    if (amount <= 0 || this.balance < amount) return false;

    // storage.addCredits can take negative amounts
    this.balance = await storage.addCredits(-amount);
    
    this.addTransaction({
      id: crypto.randomUUID(),
      amount,
      type: 'spend',
      reason,
      timestamp: Date.now()
    });

    await this.saveTransactions();
    this.notifyListeners();
    return true;
  }

  private addTransaction(transaction: Transaction) {
    this.transactions.unshift(transaction);
    // Keep only last 100 transactions
    if (this.transactions.length > 100) {
      this.transactions = this.transactions.slice(0, 100);
    }
  }

  private async saveTransactions() {
    await storage.saveSetting('retro_coins_transactions', this.transactions);
  }

  subscribe(listener: (balance: number) => void) {
    this.listeners.add(listener);
    listener(this.balance);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.balance));
  }
}

export const economy = new EconomyService();
