import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonText,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonSegment,
  IonSegmentButton,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heart, search, filter, refresh } from 'ionicons/icons';
import { Subscription } from 'rxjs';

import { FilmesService } from '../../services/filmes.service';
import { StringsService } from '../../services/strings.service';
import { MovieCardComponent } from '../../components/movie-card/movie-card.component';
import { Movie } from '../../services/filmes.service';

/**
 * Página dos filmes e séries favoritos
 * Exibe lista dos favoritos salvos localmente com opções de ordenação
 */
@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.page.html',
  styleUrls: ['./favoritos.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonText,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSegment,
    IonSegmentButton,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    CommonModule,
    FormsModule,
    MovieCardComponent,
  ],
})
export class FavoritosPage implements OnInit, OnDestroy {
  /** Lista de filmes/séries favoritos */
  favoritos: Movie[] = [];

  /** Lista filtrada para exibição */
  favoritosFiltrados: Movie[] = [];

  /** Tipo de conteúdo selecionado (todos, filme, tv) */
  tipoSelecionado: string = 'todos';

  /** Ordenação selecionada */
  ordenacao: string = 'data_adicionado';

  /** Flag para controlar loading */
  isLoading: boolean = false;

  /** Subscription para mudanças nos favoritos */
  private favoritosSubscription?: Subscription;

  constructor(
    private router: Router,
    private filmesService: FilmesService,
    public stringsService: StringsService
  ) {
    addIcons({ heart, search, filter, refresh });
  }

  /**
   * Inicialização do componente
   */
  async ngOnInit() {
    await this.carregarFavoritos();

    // Escutar mudanças nos favoritos
    this.favoritosSubscription = this.filmesService.favoritos$.subscribe(() => {
      this.carregarFavoritos();
    });
  }

  /**
   * Cleanup das subscriptions
   */
  ngOnDestroy() {
    if (this.favoritosSubscription) {
      this.favoritosSubscription.unsubscribe();
    }
  }

  /**
   * Carrega a lista de favoritos do storage
   */
  async carregarFavoritos() {
    this.isLoading = true;
    try {
      this.favoritos = await this.filmesService.getFavorites();
      this.aplicarFiltrosOrdenacao();
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
      this.favoritos = [];
      this.favoritosFiltrados = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Aplica filtros e ordenação aos favoritos
   */
  aplicarFiltrosOrdenacao() {
    let lista = [...this.favoritos];

    // Filtrar por tipo
    if (this.tipoSelecionado !== 'todos') {
      lista = lista.filter((item) => {
        if (this.tipoSelecionado === 'filme') {
          return item.title !== undefined; // Movies têm title
        } else {
          return item.name !== undefined; // TV Shows têm name
        }
      });
    }

    // Ordenar lista
    lista.sort((a, b) => {
      switch (this.ordenacao) {
        case 'data_adicionado':
          // Ordenar por data de adição (mais recentes primeiro)
          return (b.dataAdicionado || 0) - (a.dataAdicionado || 0);

        case 'alfabetica':
          const nomeA = (a.title || a.name || '').toLowerCase();
          const nomeB = (b.title || b.name || '').toLowerCase();
          return nomeA.localeCompare(nomeB);

        case 'avaliacao':
          return (b.vote_average || 0) - (a.vote_average || 0);

        case 'ano':
          const anoA = (a.release_date || a.first_air_date || '').substring(
            0,
            4
          );
          const anoB = (b.release_date || b.first_air_date || '').substring(
            0,
            4
          );
          return parseInt(anoB) - parseInt(anoA);

        default:
          return 0;
      }
    });

    this.favoritosFiltrados = lista;
  }

  /**
   * Tipo de conteúdo alterado
   */
  onTipoChanged() {
    this.aplicarFiltrosOrdenacao();
  }

  /**
   * Ordenação alterada
   */
  onOrdenacaoChanged() {
    this.aplicarFiltrosOrdenacao();
  }

  /**
   * Refresh da lista
   */
  async onRefresh(event: RefresherCustomEvent) {
    await this.carregarFavoritos();
    event.target.complete();
  }

  /**
   * Ir para página de pesquisa
   */
  irParaPesquisa() {
    this.router.navigate(['/tabs/home']);
  }
  /**
   * Remove todos os favoritos
   */
  async limparTodosFavoritos() {
    // Aqui poderia adicionar um alert de confirmação
    for (const favorito of this.favoritos) {
      await this.filmesService.removeFromFavorites(favorito.id);
    }
  }

  /**
   * TrackBy function para otimizar renderização
   */
  trackByFilmeId(index: number, filme: Movie): number {
    return filme.id;
  }

  /**
   * Obtém estatísticas dos favoritos
   */
  obterEstatisticas() {
    const filmes = this.favoritos.filter(
      (item) => item.title !== undefined
    ).length;
    const series = this.favoritos.filter(
      (item) => item.name !== undefined
    ).length;

    return {
      total: this.favoritos.length,
      filmes,
      series,
    };
  }
}
