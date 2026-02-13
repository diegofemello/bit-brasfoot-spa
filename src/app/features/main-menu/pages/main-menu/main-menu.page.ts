import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-main-menu-page',
  imports: [RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
        <h1 class="text-4xl font-bold tracking-tight">BitFoot</h1>
        <p class="text-slate-300">
          Simulador manager focado em gameplay rápido e progressão longa.
        </p>

        <div class="grid gap-3 sm:grid-cols-2">
          <a
            routerLink="/new-game"
            class="rounded-lg bg-emerald-500 px-4 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Novo Jogo
          </a>
          <a
            routerLink="/load-game"
            class="rounded-lg bg-slate-800 px-4 py-3 text-center font-semibold hover:bg-slate-700"
          >
            Carregar Jogo
          </a>
        </div>
      </section>
    </main>
  `,
})
export class MainMenuPage {}
