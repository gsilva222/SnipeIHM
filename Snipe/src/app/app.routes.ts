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
    path: 'resultados',
    loadComponent: () =>
      import('./pages/resultados/resultados.page').then(
        (m) => m.ResultadosPage
      ),
  },
  {
    path: 'resultados/:query',
    loadComponent: () =>
      import('./pages/resultados/resultados.page').then(
        (m) => m.ResultadosPage
      ),
  },
  {
    path: 'resultados/:query/:genre',
    loadComponent: () =>
      import('./pages/resultados/resultados.page').then(
        (m) => m.ResultadosPage
      ),
  },
  {
    path: 'favoritos',
    loadComponent: () =>
      import('./pages/favoritos/favoritos.page').then((m) => m.FavoritosPage),
  },
  {
    path: '**',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];
