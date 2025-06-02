import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonLabel,
  IonSpinner,
  IonText,
  IonIcon,
  IonBackButton,
  IonButtons,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  InfiniteScrollCustomEvent,
  IonSearchbar,
  IonChip,
  IonButton,
  ActionSheetController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  funnel,
  search,
  libraryOutline,
  funnelOutline,
  chevronDown,
  close,
  refresh,
  filmOutline,
  arrowUp,
  arrowDown,
  swapVertical,
} from 'ionicons/icons';

import { FilmesService } from '../../services/filmes.service';
import { StringsService } from '../../services/strings.service';
import { MovieCardComponent } from '../../components/movie-card/movie-card.component';
import { Movie } from '../../services/filmes.service';

/**
 * Página de resultados da pesquisa de filmes e séries
 * Exibe os resultados da pesquisa com filtros e ordenação
 */
@Component({
  selector: 'app-resultados',
  templateUrl: './resultados.page.html',
  styleUrls: ['./resultados.page.scss'],
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
    IonSpinner,
    IonText,
    IonIcon,
    IonBackButton,
    IonButtons,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSearchbar,
    IonChip,
    IonButton,
    CommonModule,
    FormsModule,
    MovieCardComponent,
  ],
})
export class ResultadosPage implements OnInit {
  /** Lista de filmes/séries dos resultados */
  filmes: Movie[] = [];

  /** Termo de pesquisa atual */
  termoPesquisa: string = '';

  /** Género selecionado para filtro */
  generoSelecionado: string = '';
  /** Tipo de ordenação selecionado */
  ordenacao: string = '';

  /** Direção da ordenação (asc/desc) */
  ordenacaoDirection: 'asc' | 'desc' = 'desc';

  /** Página atual para paginação */
  paginaAtual: number = 1;

  /** Flag para controlar loading */
  isLoading: boolean = false;

  /** Flag para verificar se há mais resultados */
  hasMoreResults: boolean = true;
  /** Géneros disponíveis para filtro */
  generos: any[] = [];
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private filmesService: FilmesService,
    public stringsService: StringsService,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController
  ) {
    addIcons({
      arrowBack,
      funnel,
      search,
      libraryOutline,
      funnelOutline,
      chevronDown,
      close,
      refresh,
      filmOutline,
      arrowUp,
      arrowDown,
      swapVertical,
    });
  }

  /**
   * Inicialização do componente
   * Obtém parâmetros da rota e carrega resultados
   */
  async ngOnInit() {
    // Obter parâmetros da query string
    this.route.queryParams.subscribe((params) => {
      this.termoPesquisa = params['query'] || '';
      this.generoSelecionado = params['genre'] || '';

      if (this.termoPesquisa || this.generoSelecionado) {
        this.resetPesquisa();
        this.carregarResultados();
      }
    });

    // Carregar géneros disponíveis
    await this.carregarGeneros();
  }
  /**
   * Carrega os géneros disponíveis da API
   */
  async carregarGeneros() {
    try {
      this.generos = this.filmesService.getGenres();
    } catch (error) {
      console.error('Erro ao carregar géneros:', error);
    }
  }

  /**
   * Reset dos parâmetros de pesquisa
   */
  resetPesquisa() {
    this.filmes = [];
    this.paginaAtual = 1;
    this.hasMoreResults = true;
  }
  /**
   * Carrega os resultados da pesquisa
   */
  async carregarResultados() {
    if (this.isLoading || !this.hasMoreResults) return;

    this.isLoading = true;

    try {
      let resultados: Movie[] = [];
      const sortOrder = this.getFullSortOrder();

      if (this.termoPesquisa) {
        // Pesquisa por termo
        const response = await this.filmesService
          .searchMovies(this.termoPesquisa, this.paginaAtual)
          .toPromise();
        resultados = response?.results || [];

        // Aplicar ordenação local (a API do TMDB não suporta sort em search)
        resultados = this.applySorting(resultados);
      } else if (this.generoSelecionado) {
        // Pesquisa por género
        const response = await this.filmesService
          .searchByGenre(
            parseInt(this.generoSelecionado),
            'movie', // Pode ser 'movie' ou 'tv'
            this.paginaAtual
          )
          .toPromise();
        resultados = response?.results || [];

        // Aplicar ordenação local
        resultados = this.applySorting(resultados);
      }

      if (resultados.length === 0) {
        this.hasMoreResults = false;
      } else {
        this.filmes = [...this.filmes, ...resultados];
        this.paginaAtual++;
      }
    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
      this.hasMoreResults = false;
    } finally {
      this.isLoading = false;
    }
  }
  /**
   * Nova pesquisa com termo atualizado
   */
  onNovaPesquisa() {
    if (this.termoPesquisa.trim()) {
      this.generoSelecionado = '';
      this.resetPesquisa();
      this.carregarResultados();

      // Atualizar URL
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { query: this.termoPesquisa, genre: null },
        queryParamsHandling: 'merge',
      });
    }
  }

  /**
   * Filtro por género alterado
   */
  onGeneroChanged() {
    if (this.generoSelecionado) {
      this.termoPesquisa = '';
      this.resetPesquisa();
      this.carregarResultados();

      // Atualizar URL
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { genre: this.generoSelecionado, query: null },
        queryParamsHandling: 'merge',
      });
    }
  }

  /**
   * Ordenação alterada
   */
  onOrdenacaoChanged() {
    this.resetPesquisa();
    this.carregarResultados();
  }

  /**
   * Infinite scroll para carregar mais resultados
   */
  onIonInfinite(ev: InfiniteScrollCustomEvent) {
    this.carregarResultados().then(() => {
      ev.target.complete();
    });
  }

  /**
   * Volta para a página anterior
   */
  voltarPagina() {
    this.router.navigate(['/tabs/home']);
  }
  /**
   * Obtém o nome do género pelo ID
   */
  obterNomeGenero(genreId: string): string {
    const genero = this.generos.find((g) => g.id.toString() === genreId);
    return genero ? genero.name : '';
  }

  /**
   * TrackBy function para otimizar renderização da lista
   */
  trackByFilmeId(index: number, filme: Movie): number {
    return filme.id;
  }
  /**
   * Abre modal para seleção de género
   */
  async openGenreModal() {
    const buttons = [];

    buttons.push({
      text: 'Todos os géneros',
      handler: () => {
        this.generoSelecionado = '';
        this.onGeneroChanged();
      },
    });

    // Adiciona todos os géneros disponíveis
    for (const genero of this.generos) {
      buttons.push({
        text: genero.name,
        handler: () => {
          this.generoSelecionado = genero.id.toString();
          this.onGeneroChanged();
        },
      });
    }
    buttons.push({
      text: 'Cancelar',
      role: 'cancel',
    });

    const actionSheet = await this.actionSheetController.create({
      header: 'Selecionar Género',
      buttons: buttons,
      cssClass: 'genre-action-sheet',
    });

    await actionSheet.present();
  }
  /**
   * Abre modal para seleção de ordenação
   */
  async openSortModal() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Ordenar por',
      buttons: [
        {
          text: 'Popularidade',
          handler: () => {
            this.ordenacao = 'popularity';
            this.onOrdenacaoChanged();
          },
        },
        {
          text: 'Data de Lançamento',
          handler: () => {
            this.ordenacao = 'release_date';
            this.onOrdenacaoChanged();
          },
        },
        {
          text: 'Melhor Avaliação',
          handler: () => {
            this.ordenacao = 'vote_average';
            this.onOrdenacaoChanged();
          },
        },
        {
          text: 'Ordem Alfabética',
          handler: () => {
            this.ordenacao = 'title';
            this.onOrdenacaoChanged();
          },
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
      cssClass: 'sort-action-sheet',
    });

    await actionSheet.present();
  }
  /**
   * Limpa todos os filtros
   */
  clearFilters() {
    this.generoSelecionado = '';
    this.ordenacao = '';
    this.ordenacaoDirection = 'desc';
    this.termoPesquisa = '';
    this.filmes = [];
    this.paginaAtual = 1;
    this.hasMoreResults = true;
  }
  /**
   * Obtém o label da ordenação atual
   */
  getSortLabel(): string {
    if (!this.ordenacao) {
      return 'Ordenar por';
    }

    switch (this.ordenacao) {
      case 'popularity':
        return 'Popularidade';
      case 'release_date':
        return 'Data de Lançamento';
      case 'vote_average':
        return 'Avaliação';
      case 'title':
        return 'Alfabética';
      default:
        return 'Ordenar por';
    }
  }

  /**
   * Obtém o ícone da direção da ordenação
   */
  getSortDirectionIcon(): string {
    return this.ordenacaoDirection === 'desc' ? 'arrow-down' : 'arrow-up';
  }
  /**
   * Inverte a direção da ordenação
   */
  toggleSortDirection() {
    if (this.ordenacao) {
      this.ordenacaoDirection =
        this.ordenacaoDirection === 'desc' ? 'asc' : 'desc';
      this.onOrdenacaoChanged();
    }
  }

  /**
   * Obtém a ordenação completa (campo + direção)
   */
  getFullSortOrder(): string {
    if (!this.ordenacao) {
      return 'popularity.desc'; // padrão quando não há ordenação selecionada
    }
    return `${this.ordenacao}.${this.ordenacaoDirection}`;
  }

  /**
   * Aplica ordenação local aos resultados
   */
  private applySorting(movies: Movie[]): Movie[] {
    if (!this.ordenacao) return movies;

    return movies.sort((a, b) => {
      let comparison = 0;

      switch (this.ordenacao) {
        case 'popularity':
          comparison = (b.popularity || 0) - (a.popularity || 0);
          break;
        case 'release_date':
          const dateA = new Date(
            a.release_date || a.first_air_date || '1900-01-01'
          );
          const dateB = new Date(
            b.release_date || b.first_air_date || '1900-01-01'
          );
          comparison = dateB.getTime() - dateA.getTime();
          break;
        case 'vote_average':
          comparison = (b.vote_average || 0) - (a.vote_average || 0);
          break;
        case 'title':
          const titleA = (a.title || a.name || '').toLowerCase();
          const titleB = (b.title || b.name || '').toLowerCase();
          comparison = titleA.localeCompare(titleB);
          break;
      }

      return this.ordenacaoDirection === 'asc' ? -comparison : comparison;
    });
  }
  /**
   * Callback quando um filme é clicado (abre modal de detalhes)
   */
  onMovieClicked(movie: Movie): void {
    console.log('Filme clicado:', movie.title || movie.name);
    // O modal é aberto diretamente pelo MovieCardComponent
  }

  /**
   * Callback quando um filme é adicionado aos favoritos
   */
  async onAddedToFavorites(movie: Movie): Promise<void> {
    const movieTitle = movie.title || movie.name || 'Filme';
    console.log('Filme adicionado aos favoritos:', movieTitle);

    const toast = await this.toastController.create({
      message: `${movieTitle} adicionado aos favoritos!`,
      duration: 2000,
      color: 'success',
      position: 'bottom',
      icon: 'heart',
      cssClass: 'custom-toast',
    });
    await toast.present();
  }

  /**
   * Callback quando um filme é removido dos favoritos
   */
  async onRemovedFromFavorites(movieId: number): Promise<void> {
    console.log('Filme removido dos favoritos:', movieId);

    const toast = await this.toastController.create({
      message: 'Filme removido dos favoritos',
      duration: 2000,
      color: 'warning',
      position: 'bottom',
      icon: 'heart-dislike',
      cssClass: 'custom-toast',
    });
    await toast.present();
  }
}
