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
        path: 'resultados',
        loadComponent: () =>
          import('../pages/resultados/resultados.page').then(
            (m) => m.ResultadosPage
          ),
      },
      {
        path: 'resultados/:query',
        loadComponent: () =>
          import('../pages/resultados/resultados.page').then(
            (m) => m.ResultadosPage
          ),
      },
      {
        path: 'resultados/:query/:genre',
        loadComponent: () =>
          import('../pages/resultados/resultados.page').then(
            (m) => m.ResultadosPage
          ),
      },
      {
        path: 'favoritos',
        loadComponent: () =>
          import('../pages/favoritos/favoritos.page').then(
            (m) => m.FavoritosPage
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
