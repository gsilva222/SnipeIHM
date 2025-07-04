import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

/**
 * Configuração das rotas dos tabs da aplicação Snipe
 * Define a navegação entre Home, Resultados e Favoritos
 */
export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('../pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'pesquisa',
        loadComponent: () =>
          import('../pages/pesquisa/pesquisa.page').then((m) => m.PesquisaPage),
      },
      {
        path: 'pesquisa/:query',
        loadComponent: () =>
          import('../pages/pesquisa/pesquisa.page').then((m) => m.PesquisaPage),
      },
      {
        path: 'pesquisa/:query/:genre',
        loadComponent: () =>
          import('../pages/pesquisa/pesquisa.page').then((m) => m.PesquisaPage),
      },
      {
        path: 'favoritos',
        loadComponent: () =>
          import('../pages/favoritos/favoritos.page').then(
            (m) => m.FavoritosPage
          ),
      },
      {
        path: 'reminders',
        loadComponent: () =>
          import('../pages/reminders/reminders.page').then(
            (m) => m.RemindersPage
          ),
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];
