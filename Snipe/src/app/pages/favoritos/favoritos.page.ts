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
  IonLabel,
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
  IonChip,
  ActionSheetController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  heart,
  search,
  filter,
  refresh,
  chevronDown,
  arrowUp,
  arrowDown,
  swapVertical,
} from 'ionicons/icons';
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
    IonLabel,
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
    IonChip,
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
  ordenacao: string = '';

  /** Direção da ordenação (asc/desc) */
  ordenacaoDirection: 'asc' | 'desc' = 'desc';

  /** Flag para controlar loading */
  isLoading: boolean = false;

  /** Subscription para mudanças nos favoritos */
  private favoritosSubscription?: Subscription;
  constructor(
    private router: Router,
    private filmesService: FilmesService,
    public stringsService: StringsService,
    private actionSheetController: ActionSheetController
  ) {
    addIcons({
      heart,
      search,
      filter,
      refresh,
      chevronDown,
      arrowUp,
      arrowDown,
      swapVertical,
    });
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

    // Aplicar ordenação se selecionada
    if (this.ordenacao) {
      lista = this.applySorting(lista);
    }

    this.favoritosFiltrados = lista;
  }

  /**
   * Aplica ordenação baseada nos critérios selecionados
   */
  private applySorting(lista: Movie[]): Movie[] {
    return lista.sort((a, b) => {
      let comparison = 0;

      switch (this.ordenacao) {
        case 'data_adicionado':
          // Ordenar por data de adição
          comparison = (a.dataAdicionado || 0) - (b.dataAdicionado || 0);
          break;

        case 'alfabetica':
          const nomeA = (a.title || a.name || '').toLowerCase();
          const nomeB = (b.title || b.name || '').toLowerCase();
          comparison = nomeA.localeCompare(nomeB);
          break;

        case 'avaliacao':
          comparison = (a.vote_average || 0) - (b.vote_average || 0);
          break;

        case 'ano':
          const anoA =
            parseInt(
              (a.release_date || a.first_air_date || '').substring(0, 4)
            ) || 0;
          const anoB =
            parseInt(
              (b.release_date || b.first_air_date || '').substring(0, 4)
            ) || 0;
          comparison = anoA - anoB;
          break;

        default:
          return 0;
      }

      // Aplicar direção da ordenação
      return this.ordenacaoDirection === 'asc' ? comparison : -comparison;
    });
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
   * Abre o ActionSheet para seleção de ordenação
   */
  async openOrdenacaoActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: this.stringsService.get('ordenar_por'),
      cssClass: 'ordenacao-action-sheet',
      buttons: [
        {
          text: this.stringsService.get('data_adicao'),
          handler: () => {
            this.ordenacao = 'data_adicionado';
            this.aplicarFiltrosOrdenacao();
          },
        },
        {
          text: this.stringsService.get('alfabetica'),
          handler: () => {
            this.ordenacao = 'alfabetica';
            this.aplicarFiltrosOrdenacao();
          },
        },
        {
          text: this.stringsService.get('melhor_avaliacao'),
          handler: () => {
            this.ordenacao = 'avaliacao';
            this.aplicarFiltrosOrdenacao();
          },
        },
        {
          text: this.stringsService.get('ano_lancamento'),
          handler: () => {
            this.ordenacao = 'ano';
            this.aplicarFiltrosOrdenacao();
          },
        },
        {
          text: this.stringsService.get('cancelar'),
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  /**
   * Alterna direção da ordenação
   */
  toggleOrdenacaoDirection() {
    this.ordenacaoDirection =
      this.ordenacaoDirection === 'asc' ? 'desc' : 'asc';
    if (this.ordenacao) {
      this.aplicarFiltrosOrdenacao();
    }
  }

  /**
   * Obtém o texto da ordenação selecionada
   */
  getOrdenacaoText(): string {
    if (!this.ordenacao) {
      return this.stringsService.get('ordenar_por');
    }

    switch (this.ordenacao) {
      case 'data_adicionado':
        return this.stringsService.get('data_adicao');
      case 'alfabetica':
        return this.stringsService.get('alfabetica');
      case 'avaliacao':
        return this.stringsService.get('melhor_avaliacao');
      case 'ano':
        return this.stringsService.get('ano_lancamento');
      default:
        return this.stringsService.get('ordenar_por');
    }
  }

  /**
   * Obtém o ícone da direção da ordenação
   */
  getDirectionIcon(): string {
    if (!this.ordenacao) {
      return 'swap-vertical';
    }
    return this.ordenacaoDirection === 'asc' ? 'arrow-up' : 'arrow-down';
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
