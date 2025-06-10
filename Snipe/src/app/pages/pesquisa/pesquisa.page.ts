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
  calendarOutline,
  starOutline,
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
  selector: 'app-pesquisa',
  templateUrl: './pesquisa.page.html',
  styleUrls: ['./pesquisa.page.scss'],
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
export class PesquisaPage implements OnInit {
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

  /** Filtros adicionais */
  anoInicio: number = 0;
  anoFim: number = 0;
  avaliacaoMinima: number = 0;
  tipoConteudo: 'all' | 'movie' | 'tv' = 'all';

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
      libraryOutline,
      chevronDown,
      calendarOutline,
      starOutline,
      filmOutline,
      funnelOutline,
      close,
      search,
      refresh,
      arrowBack,
      funnel,
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
      this.anoInicio = parseInt(params['yearStart']) || 0;
      this.anoFim = parseInt(params['yearEnd']) || 0;
      this.avaliacaoMinima = parseFloat(params['minRating']) || 0;
      this.tipoConteudo = params['contentType'] || 'all';
      this.ordenacao = params['sort'] || '';
      this.ordenacaoDirection = params['sortDirection'] || 'desc';

      if (
        this.termoPesquisa ||
        this.generoSelecionado ||
        this.hasActiveFilters()
      ) {
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
      } else if (this.generoSelecionado || this.hasActiveFilters()) {
        // Pesquisa por género ou filtros
        const response = await this.filmesService
          .searchByGenre(
            parseInt(this.generoSelecionado) || 0,
            this.tipoConteudo === 'all' ? 'movie' : this.tipoConteudo,
            this.paginaAtual
          )
          .toPromise();
        resultados = response?.results || [];
      }

      // Aplicar filtros locais
      resultados = this.applyLocalFilters(resultados);

      // Aplicar ordenação local
      resultados = this.applySorting(resultados);

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
      this.updateUrlParams();
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
      this.updateUrlParams();
    }
  }

  /**
   * Ordenação alterada
   */
  onOrdenacaoChanged() {
    this.resetPesquisa();
    this.carregarResultados();
    this.updateUrlParams();
  }

  /**
   * Verifica se há filtros ativos
   */
  hasActiveFilters(): boolean {
    return (
      this.anoInicio > 0 ||
      this.anoFim > 0 ||
      this.avaliacaoMinima > 0 ||
      this.tipoConteudo !== 'all'
    );
  }

  /**
   * Aplica filtros locais aos resultados
   */
  private applyLocalFilters(movies: Movie[]): Movie[] {
    return movies.filter((movie) => {
      // Filtro de ano
      if (this.anoInicio > 0 || this.anoFim > 0) {
        const releaseDate = movie.release_date || movie.first_air_date;
        if (releaseDate) {
          const year = new Date(releaseDate).getFullYear();
          if (this.anoInicio > 0 && year < this.anoInicio) return false;
          if (this.anoFim > 0 && year > this.anoFim) return false;
        }
      }

      // Filtro de avaliação mínima
      if (
        this.avaliacaoMinima > 0 &&
        (movie.vote_average || 0) < this.avaliacaoMinima
      ) {
        return false;
      }

      // Filtro de tipo de conteúdo
      if (this.tipoConteudo !== 'all') {
        const isMovie = movie.title !== undefined;
        const isTv = movie.name !== undefined;

        if (this.tipoConteudo === 'movie' && !isMovie) return false;
        if (this.tipoConteudo === 'tv' && !isTv) return false;
      }

      return true;
    });
  }

  /**
   * Atualiza os parâmetros da URL com os filtros atuais
   */
  private updateUrlParams() {
    const queryParams: any = {};

    if (this.termoPesquisa) queryParams.query = this.termoPesquisa;
    if (this.generoSelecionado) queryParams.genre = this.generoSelecionado;
    if (this.anoInicio > 0) queryParams.yearStart = this.anoInicio;
    if (this.anoFim > 0) queryParams.yearEnd = this.anoFim;
    if (this.avaliacaoMinima > 0) queryParams.minRating = this.avaliacaoMinima;
    if (this.tipoConteudo !== 'all')
      queryParams.contentType = this.tipoConteudo;
    if (this.ordenacao) queryParams.sort = this.ordenacao;
    if (this.ordenacao) queryParams.sortDirection = this.ordenacaoDirection;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'replace',
    });
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
   * Abre modal para filtro de ano
   */
  async openYearModal() {
    const currentYear = new Date().getFullYear();
    const startYear = 1900;

    const actionSheet = await this.actionSheetController.create({
      header: 'Filtrar por Ano',
      buttons: [
        {
          text: 'Últimos 5 anos',
          handler: () => {
            this.anoInicio = currentYear - 5;
            this.anoFim = currentYear;
            this.onFiltersChanged();
          },
        },
        {
          text: 'Última década (2010-' + currentYear + ')',
          handler: () => {
            this.anoInicio = 2010;
            this.anoFim = currentYear;
            this.onFiltersChanged();
          },
        },
        {
          text: 'Anos 2000-2009',
          handler: () => {
            this.anoInicio = 2000;
            this.anoFim = 2009;
            this.onFiltersChanged();
          },
        },
        {
          text: 'Anos 1990-1999',
          handler: () => {
            this.anoInicio = 1990;
            this.anoFim = 1999;
            this.onFiltersChanged();
          },
        },
        {
          text: 'Clássicos (antes de 1990)',
          handler: () => {
            this.anoInicio = startYear;
            this.anoFim = 1989;
            this.onFiltersChanged();
          },
        },
        {
          text: 'Remover filtro de ano',
          handler: () => {
            this.anoInicio = 0;
            this.anoFim = 0;
            this.onFiltersChanged();
          },
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
      cssClass: 'year-action-sheet',
    });

    await actionSheet.present();
  }

  /**
   * Abre modal para filtro de avaliação
   */
  async openRatingModal() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Avaliação Mínima',
      buttons: [
        {
          text: '9.0+ ⭐ Obras-primas',
          handler: () => {
            this.avaliacaoMinima = 9.0;
            this.onFiltersChanged();
          },
        },
        {
          text: '8.0+ ⭐ Excelentes',
          handler: () => {
            this.avaliacaoMinima = 8.0;
            this.onFiltersChanged();
          },
        },
        {
          text: '7.0+ ⭐ Muito bons',
          handler: () => {
            this.avaliacaoMinima = 7.0;
            this.onFiltersChanged();
          },
        },
        {
          text: '6.0+ ⭐ Bons',
          handler: () => {
            this.avaliacaoMinima = 6.0;
            this.onFiltersChanged();
          },
        },
        {
          text: '5.0+ ⭐ Médios',
          handler: () => {
            this.avaliacaoMinima = 5.0;
            this.onFiltersChanged();
          },
        },
        {
          text: 'Remover filtro de avaliação',
          handler: () => {
            this.avaliacaoMinima = 0;
            this.onFiltersChanged();
          },
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
      cssClass: 'rating-action-sheet',
    });

    await actionSheet.present();
  }

  /**
   * Abre modal para filtro de tipo de conteúdo
   */
  async openContentTypeModal() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Tipo de Conteúdo',
      buttons: [
        {
          text: 'Todos',
          handler: () => {
            this.tipoConteudo = 'all';
            this.onFiltersChanged();
          },
        },
        {
          text: 'Filmes',
          handler: () => {
            this.tipoConteudo = 'movie';
            this.onFiltersChanged();
          },
        },
        {
          text: 'Séries',
          handler: () => {
            this.tipoConteudo = 'tv';
            this.onFiltersChanged();
          },
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
      cssClass: 'content-type-action-sheet',
    });

    await actionSheet.present();
  }

  /**
   * Callback quando os filtros são alterados
   */
  onFiltersChanged() {
    this.resetPesquisa();
    this.carregarResultados();
    this.updateUrlParams();
  }

  /**
   * Obtém o texto do filtro de ano
   */
  getYearFilterText(): string {
    if (this.anoInicio > 0 || this.anoFim > 0) {
      if (this.anoInicio > 0 && this.anoFim > 0) {
        return `${this.anoInicio}-${this.anoFim}`;
      } else if (this.anoInicio > 0) {
        return `Após ${this.anoInicio}`;
      } else {
        return `Até ${this.anoFim}`;
      }
    }
    return 'Ano';
  }

  /**
   * Obtém o texto do filtro de avaliação
   */
  getRatingFilterText(): string {
    if (this.avaliacaoMinima > 0) {
      return `${this.avaliacaoMinima.toFixed(1)}+ ⭐`;
    }
    return 'Avaliação';
  }
  /**
   * Obtém o texto do filtro de tipo de conteúdo
   */
  getContentTypeText(): string {
    switch (this.tipoConteudo) {
      case 'movie':
        return 'Filmes';
      case 'tv':
        return 'Séries';
      default:
        return 'Tipo';
    }
  }
  /**
   * Limpa todos os filtros
   */
  clearFilters() {
    this.generoSelecionado = '';
    this.ordenacao = '';
    this.ordenacaoDirection = 'desc';
    this.termoPesquisa = '';
    this.anoInicio = 0;
    this.anoFim = 0;
    this.avaliacaoMinima = 0;
    this.tipoConteudo = 'all';
    this.filmes = [];
    this.paginaAtual = 1;
    this.hasMoreResults = true;
    this.updateUrlParams();
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
