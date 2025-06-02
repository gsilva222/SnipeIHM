import {
  Component,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  home,
  search,
  star,
  bookmark,
  film,
  chevronForward,
  play,
} from 'ionicons/icons';

import { FilmesService, Movie } from '../../services/filmes.service';
import { StringsService } from '../../services/strings.service';
import { MovieCardComponent } from '../../components/movie-card/movie-card.component';
import { MovieDetailsModalComponent } from '../../components/movie-details-modal/movie-details-modal.component';

/**
 * Página inicial da aplicação Snipe
 * Contém formulário de pesquisa com Reactive Forms
 * Implementa navegação para resultados com parâmetros
 */
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonSpinner,
    CommonModule,
    MovieCardComponent,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  /** Lista de filmes populares */
  popularMovies: Movie[] = [];

  /** Lista de séries populares */
  popularTVShows: Movie[] = [];

  /** Estado de carregamento */
  isLoading = true;

  /** Subject para gerir unsubscriptions */
  private destroy$ = new Subject<void>();
  /**
   * Construtor da página Home
   * @param router - Router para navegação
   * @param filmesService - Serviço de filmes
   * @param stringsService - Serviço de strings
   * @param modalController - Controller para modais
   */ constructor(
    private router: Router,
    public filmesService: FilmesService,
    public stringsService: StringsService,
    private modalController: ModalController
  ) {
    // Registar ícones necessários
    addIcons({
      home,
      search,
      star,
      bookmark,
      film,
      chevronForward,
      play,
    });
  }
  /**
   * Inicialização do componente
   */
  async ngOnInit() {
    await this.loadPopularContent();
  }

  /**
   * Cleanup do componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /**
   * Carrega conteúdo popular (filmes e séries)
   */
  async loadPopularContent() {
    this.isLoading = true;

    try {
      // Carregar filmes populares
      this.filmesService
        .getPopularMovies(1)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.popularMovies = response.results.slice(0, 10); // Primeiros 10
          },
          error: (error) => {
            console.error('Erro ao carregar filmes populares:', error);
          },
        });

      // Carregar séries populares
      this.filmesService
        .getPopularTVShows(1)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.popularTVShows = response.results.slice(0, 10); // Primeiros 10
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Erro ao carregar séries populares:', error);
            this.isLoading = false;
          },
        });
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
      this.isLoading = false;
    }
  }

  /**
   * Navega para a página de pesquisa
   */
  goToSearch() {
    this.router.navigate(['/tabs/resultados']);
  }

  /**
   * Navega para ver todos os filmes populares
   */
  viewAllMovies() {
    this.router.navigate(['/tabs/resultados'], {
      queryParams: { type: 'popular_movies' },
    });
  }

  /**
   * Navega para ver todas as séries populares
   */
  viewAllTVShows() {
    this.router.navigate(['/tabs/resultados'], {
      queryParams: { type: 'popular_tv' },
    });
  }
  /**
   * Abre detalhes de um filme/série
   * @param movie - Filme ou série selecionada
   */
  async openMovieDetails(movie: Movie) {
    const modal = await this.modalController.create({
      component: MovieDetailsModalComponent,
      componentProps: {
        movie: movie,
      },
      backdropDismiss: true,
      showBackdrop: true,
      cssClass: 'movie-details-modal',
    });

    await modal.present();
  }
}
