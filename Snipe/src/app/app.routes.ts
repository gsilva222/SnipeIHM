import { Routes } from '@angular/router';

/**
 * Configuração das rotas principais da aplicação Snipe
 * Estrutura baseada em tabs com navegação lazy loading
 */
export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'pesquisa',
    loadComponent: () =>
      import('./pages/pesquisa/pesquisa.page').then((m) => m.PesquisaPage),
  },
  {
    path: 'pesquisa/:query',
    loadComponent: () =>
      import('./pages/pesquisa/pesquisa.page').then((m) => m.PesquisaPage),
  },
  {
    path: 'pesquisa/:query/:genre',
    loadComponent: () =>
      import('./pages/pesquisa/pesquisa.page').then((m) => m.PesquisaPage),
  },
  {
    path: 'favoritos',
    loadComponent: () =>
      import('./pages/favoritos/favoritos.page').then((m) => m.FavoritosPage),
  },
  {
    path: 'reminders',
    loadComponent: () =>
      import('./pages/reminders/reminders.page').then((m) => m.RemindersPage),
  },
  {
    path: 'logo',
    loadComponent: () =>
      import('./pages/logo/logo.page').then((m) => m.LogoPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: '**',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];
