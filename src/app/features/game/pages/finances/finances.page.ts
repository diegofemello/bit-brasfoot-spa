import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaginatedResult } from '../../../../core/models/paginated-result.model';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface FinanceAccount {
  saveGameId: string;
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

interface FinanceTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  createdAt: string;
}

@Component({
  selector: 'app-finances-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-10">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Finanças</h1>
          <a routerLink="/dashboard" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        @if (account()) {
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
              <p class="text-xs text-slate-400">Saldo</p>
              <p class="text-xl font-bold text-emerald-400">{{ formatCurrency(account()?.balance || 0) }}</p>
            </div>
            <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
              <p class="text-xs text-slate-400">Receitas</p>
              <p class="text-xl font-bold">{{ formatCurrency(account()?.monthlyIncome || 0) }}</p>
            </div>
            <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
              <p class="text-xs text-slate-400">Despesas</p>
              <p class="text-xl font-bold">{{ formatCurrency(account()?.monthlyExpense || 0) }}</p>
            </div>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-lg font-semibold">Gráfico de fluxo mensal</h2>
            <div class="grid gap-3">
              <div>
                <p class="mb-1 text-xs text-slate-400">Receita</p>
                <div class="h-4 rounded bg-slate-800">
                  <div class="h-4 rounded bg-emerald-500" [style.width.%]="incomeBarPercent()"></div>
                </div>
              </div>
              <div>
                <p class="mb-1 text-xs text-slate-400">Despesa</p>
                <div class="h-4 rounded bg-slate-800">
                  <div class="h-4 rounded bg-rose-500" [style.width.%]="expenseBarPercent()"></div>
                </div>
              </div>
            </div>
          </div>
        }

        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 class="mb-3 text-lg font-semibold">Novo lançamento</h2>
          <div class="grid gap-2 sm:grid-cols-4">
            <select
              [value]="transactionType()"
              (change)="transactionType.set($any($event.target).value)"
              class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
            <input
              type="text"
              [value]="category()"
              (input)="category.set($any($event.target).value)"
              placeholder="Categoria"
              class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
            />
            <input
              type="number"
              [value]="amount()"
              (input)="amount.set(+$any($event.target).value)"
              placeholder="Valor"
              class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
            />
            <button
              type="button"
              (click)="createTransaction()"
              class="rounded bg-emerald-500 px-2 py-1 font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Registrar
            </button>
          </div>
        </div>

        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 class="mb-3 text-lg font-semibold">Transações</h2>
          <div class="grid gap-2">
            @for (item of transactions(); track item.id) {
              <div class="flex items-center justify-between rounded bg-slate-950 px-3 py-2 text-sm">
                <div>
                  <p>{{ item.description }}</p>
                  <p class="text-xs text-slate-400">{{ item.category }}</p>
                </div>
                <p [class.text-emerald-400]="item.type === 'income'" [class.text-rose-400]="item.type === 'expense'">
                  {{ item.type === 'income' ? '+' : '-' }}{{ formatCurrency(item.amount) }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>
    </main>
  `,
})
export class FinancesPage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly account = signal<FinanceAccount | null>(null);
  readonly transactions = signal<FinanceTransaction[]>([]);

  readonly transactionType = signal<'income' | 'expense'>('income');
  readonly category = signal('manual');
  readonly amount = signal(100000);

  ngOnInit() {
    this.load();
  }

  load() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.apiService.get<FinanceAccount>(`finances/save/${saveGameId}/account`).subscribe({
      next: (account) => this.account.set(account),
    });

    this.apiService
      .get<PaginatedResult<FinanceTransaction>>(`finances/save/${saveGameId}/transactions`, {
        page: 1,
        limit: 20,
      })
      .subscribe({
        next: (result) => this.transactions.set(result.data),
      });
  }

  createTransaction() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId || this.amount() <= 0) return;

    this.apiService
      .post<FinanceTransaction>('finances/transactions', {
        saveGameId,
        type: this.transactionType(),
        category: this.category(),
        amount: this.amount(),
        description: `Lançamento ${this.category()}`,
      })
      .subscribe({
        next: () => this.load(),
      });
  }

  incomeBarPercent() {
    const account = this.account();
    if (!account) return 0;
    const max = Math.max(account.monthlyIncome, account.monthlyExpense, 1);
    return Math.round((account.monthlyIncome / max) * 100);
  }

  expenseBarPercent() {
    const account = this.account();
    if (!account) return 0;
    const max = Math.max(account.monthlyIncome, account.monthlyExpense, 1);
    return Math.round((account.monthlyExpense / max) * 100);
  }

  formatCurrency(value: number) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${Math.round(value / 1000)}K`;
  }
}
