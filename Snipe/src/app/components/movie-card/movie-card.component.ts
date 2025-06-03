import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  heart,
  heartOutline,
  star,
  calendar,
  close,
  chevronForward,
  thumbsUp,
  trendingUp,
  language,
  people,
  trash,
  filmOutline,
  tvOutline,
  playOutline,
} from 'ionicons/icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Movie, FilmesService } from '../../services/filmes.service';
import { StringsService } from '../../services/strings.service';
import { MovieDetailsModalComponent } from '../movie-details-modal/movie-details-modal.component';

/**
 * Componente reutilizável para exibir informações de um filme/série
 * Inclui funcionalidades de favoritos e navegação
 */
@Component({
  selector: 'app-movie-card',
  templateUrl: './movie-card.component.html',
  styleUrls: ['./movie-card.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonChip,
    IonLabel,
  ],
})
export class MovieCardComponent implements OnInit, OnDestroy {
  /** Filme a ser exibido no card */
  @Input() movie!: Movie;

  /** Indica se deve mostrar o botão de remover (usado na página de favoritos) */
  @Input() showRemoveButton: boolean = false;

  /** Indica se deve esconder a descrição (modo compacto) */
  @Input() hideOverview: boolean = false;

  /** Evento emitido quando o filme é clicado */
  @Output() movieClicked = new EventEmitter<Movie>();

  /** Evento emitido quando o filme é adicionado aos favoritos */
  @Output() addedToFavorites = new EventEmitter<Movie>();

  /** Evento emitido quando o filme é removido dos favoritos */
  @Output() removedFromFavorites = new EventEmitter<number>();

  /** Indica se o filme está nos favoritos */
  isFavorite: boolean = false;

  /** Indica se está a processar ação de favorito */
  isProcessingFavorite: boolean = false;

  /** Classe de animação temporária para feedback visual */
  favoriteAnimationClass: string = '';

  /** Subject para gerir unsubscriptions */
  private destroy$ = new Subject<void>();
  /**
   * Construtor do componente
   * @param filmesService - Serviço de filmes
   * @param stringsService - Serviço de strings
   * @param modalController - Controlador de modais
   * @param toastController - Controlador de toasts
   */
  constructor(
    private filmesService: FilmesService,
    public stringsService: StringsService,
    private modalController: ModalController,
    private toastController: ToastController
  ) {
    // Adiciona os ícones necessários
    addIcons({
      heart,
      heartOutline,
      star,
      calendar,
      close,
      chevronForward,
      thumbsUp,
      trendingUp,
      language,
      people,
      trash,
      filmOutline,
      tvOutline,
      playOutline,
    });
  }

  /**
   * Inicialização do componente
   */
  async ngOnInit(): Promise<void> {
    if (this.movie) {
      await this.checkIfFavorite();
    }
  }

  /**
   * Destruição do componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Verifica se o filme está nos favoritos
   */
  private async checkIfFavorite(): Promise<void> {
    try {
      this.isFavorite = await this.filmesService.isFavorite(this.movie.id);
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
    }
  }
  /**
   * Manipula clique no card do filme - abre modal de detalhes
   */
  async onMovieClick(): Promise<void> {
    this.movieClicked.emit(this.movie);

    // Abre modal de detalhes
    const modal = await this.modalController.create({
      component: MovieDetailsModalComponent,
      componentProps: {
        movie: this.movie,
      },
      cssClass: 'movie-details-modal',
    });

    await modal.present();
  }

  /**
   * Manipula clique no botão de favorito
   * @param event - Evento do clique (para parar propagação)
   */ async onFavoriteClick(event: Event): Promise<void> {
    event.stopPropagation(); // Evita que o clique no card seja disparado

    if (this.isProcessingFavorite) {
      return;
    }

    this.isProcessingFavorite = true;

    try {
      if (this.isFavorite) {
        await this.filmesService.removeFromFavorites(this.movie.id);
        this.isFavorite = false;
        this.triggerAnimation('favorite-removed');
        this.removedFromFavorites.emit(this.movie.id);
      } else {
        await this.filmesService.addToFavorites(this.movie);
        this.isFavorite = true;
        this.triggerAnimation('favorite-added');
        this.addedToFavorites.emit(this.movie);
      }
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
    } finally {
      this.isProcessingFavorite = false;
    }
  }

  /**
   * Dispara animação temporária no botão de favoritos
   */
  private triggerAnimation(animationClass: string): void {
    this.favoriteAnimationClass = animationClass;
    setTimeout(() => {
      this.favoriteAnimationClass = '';
    }, 600); // Duração da animação
  }

  /**
   * Obtém URL da imagem do poster
   * @returns URL da imagem ou placeholder
   */
  getPosterUrl(): string {
    return this.filmesService.getImageUrl(this.movie.poster_path, 'w300');
  }

  /**
   * Obtém o título do filme/série
   * @returns Título formatado
   */
  getTitle(): string {
    return this.movie.title || this.movie.name || 'Título não disponível';
  }

  /**
   * Obtém o ano de lançamento
   * @returns Ano formatado ou string vazia
   */
  getReleaseYear(): string {
    const date = this.movie.release_date || this.movie.first_air_date;
    if (date) {
      return new Date(date).getFullYear().toString();
    }
    return '';
  }

  /**
   * Obtém a classificação formatada
   * @returns Classificação com uma casa decimal
   */
  getRating(): string {
    return this.movie.vote_average ? this.movie.vote_average.toFixed(1) : '0.0';
  }
  /**
   * Obtém o ícone de estrelas baseado na classificação
   * @returns Nome do ícone Ionicon
   */
  getStarIcon(): string {
    const rating = this.movie.vote_average || 0;

    // Sistema de estrelas mais preciso
    if (rating >= 9) return 'star'; // Excelente
    if (rating >= 8) return 'star'; // Muito bom
    if (rating >= 7) return 'star'; // Bom
    if (rating >= 6) return 'star-half'; // Razoável
    if (rating >= 4) return 'star-half'; // Médio
    if (rating >= 2) return 'star-outline'; // Fraco

    return 'star-outline'; // Muito fraco ou sem avaliação
  }
  /**
   * Obtém a cor da classificação baseada no valor
   * @returns Classe CSS para a cor
   */
  getRatingColor(): string {
    const rating = this.movie.vote_average || 0;

    // Sistema de cores mais detalhado
    if (rating >= 9) return 'rating-excellent'; // Verde escuro para excelente
    if (rating >= 8) return 'rating-high'; // Verde para muito bom
    if (rating >= 7) return 'rating-good'; // Amarelo/dourado para bom
    if (rating >= 6) return 'rating-medium'; // Laranja para razoável
    if (rating >= 4) return 'rating-low'; // Vermelho claro para médio
    if (rating >= 2) return 'rating-poor'; // Vermelho para fraco

    return 'rating-none'; // Cinza para sem avaliação
  }

  /**
   * Formata a descrição para exibição limitada
   * @param maxLength - Número máximo de caracteres
   * @returns Descrição truncada
   */
  getFormattedOverview(maxLength: number = 150): string {
    if (!this.movie.overview) {
      return 'Descrição não disponível';
    }

    if (this.movie.overview.length <= maxLength) {
      return this.movie.overview;
    }

    return this.movie.overview.substring(0, maxLength) + '...';
  }
  /**
   * Obtém o tipo de media formatado
   * @returns Tipo de media em português
   */
  getMediaType(): string {
    // Prioriza media_type se disponível
    if (this.movie.media_type === 'movie') return 'Filme';
    if (this.movie.media_type === 'tv') return 'Série';

    // Fallback baseado na presença de campos específicos
    if (this.movie.title && !this.movie.name) return 'Filme';
    if (this.movie.name && !this.movie.title) return 'Série';
    if (this.movie.first_air_date) return 'Série';
    if (this.movie.release_date) return 'Filme';

    return 'Conteúdo';
  }

  /**
   * Obtém o ícone apropriado para o tipo de mídia
   * @returns Nome do ícone Ionicon
   */
  getMediaTypeIcon(): string {
    // Prioriza media_type se disponível
    if (this.movie.media_type === 'movie') return 'film-outline';
    if (this.movie.media_type === 'tv') return 'tv-outline';

    // Fallback baseado na presença de campos específicos
    if (this.movie.title && !this.movie.name) return 'film-outline';
    if (this.movie.name && !this.movie.title) return 'tv-outline';
    if (this.movie.first_air_date) return 'tv-outline';
    if (this.movie.release_date) return 'film-outline';

    return 'play-outline';
  }

  /**
   * Obtém a classe CSS apropriada para o badge de tipo de mídia
   * @returns Classe CSS para styling
   */
  getMediaTypeBadgeClass(): string {
    // Prioriza media_type se disponível
    if (this.movie.media_type === 'movie') return 'movie-badge';
    if (this.movie.media_type === 'tv') return 'tv-badge';

    // Fallback baseado na presença de campos específicos
    if (this.movie.title && !this.movie.name) return 'movie-badge';
    if (this.movie.name && !this.movie.title) return 'tv-badge';
    if (this.movie.first_air_date) return 'tv-badge';
    if (this.movie.release_date) return 'movie-badge';

    return 'content-badge';
  }

  /**
   * Verifica se o filme tem uma boa classificação
   * @returns true se a classificação for >= 7
   */
  hasGoodRating(): boolean {
    return (this.movie.vote_average || 0) >= 7;
  }

  /**
   * Obtém o ícone do botão de favorito
   * @returns Nome do ícone Ionicon
   */ getFavoriteIcon(): string {
    if (this.isProcessingFavorite) {
      return 'hourglass';
    }
    return this.isFavorite ? 'heart' : 'heart-outline';
  }

  /**
   * Obtém a cor do botão de favorito
   * @returns Classe CSS para a cor
   */
  getFavoriteColor(): string {
    return this.isFavorite ? 'danger' : 'medium';
  }

  /**
   * Obtém o texto do botão de favorito
   * @returns Texto do botão
   */
  getFavoriteButtonText(): string {
    if (this.isProcessingFavorite) {
      return 'A processar...';
    }

    const key = this.isFavorite
      ? 'movie_card.remove_favorite'
      : 'movie_card.add_favorite';
    return this.stringsService.getString(key);
  }
}
