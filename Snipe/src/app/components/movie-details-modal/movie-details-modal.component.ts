import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonIcon,
  IonChip,
  IonLabel,
  IonFab,
  IonFabButton,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  heart,
  heartOutline,
  heartDislike,
  star,
  documentTextOutline,
  informationCircleOutline,
  libraryOutline,
  trendingUp,
  calendarOutline,
  checkmarkCircle,
  closeCircle,
  filmOutline,
  tvOutline,
  playOutline,
} from 'ionicons/icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Movie, FilmesService } from '../../services/filmes.service';
import { StringsService } from '../../services/strings.service';

/**
 * Modal de detalhes do filme com informações completas
 */
@Component({
  selector: 'app-movie-details-modal',
  templateUrl: './movie-details-modal.component.html',
  styleUrls: ['./movie-details-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonIcon,
    IonChip,
    IonLabel,
    IonFab,
    IonFabButton,
  ],
})
export class MovieDetailsModalComponent implements OnInit, OnDestroy {
  @Input() movie!: Movie;

  /** Indica se o filme está nos favoritos */
  isFavorite: boolean = false;

  /** Indica se está a processar ação de favorito */
  isProcessingFavorite: boolean = false;

  /** Subject para gerir unsubscriptions */
  private destroy$ = new Subject<void>();
  constructor(
    private modalController: ModalController,
    private filmesService: FilmesService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
    public stringsService: StringsService
  ) {
    addIcons({
      close,
      heart,
      heartOutline,
      heartDislike,
      star,
      documentTextOutline,
      informationCircleOutline,
      libraryOutline,
      trendingUp,
      calendarOutline,
      checkmarkCircle,
      closeCircle,
      filmOutline,
      tvOutline,
      playOutline,
    });
  }

  async ngOnInit() {
    if (this.movie) {
      await this.checkIfFavorite();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fecha o modal
   */
  async closeModal() {
    await this.modalController.dismiss();
  }
  /**
   * Verifica se o filme está nos favoritos
   */
  private async checkIfFavorite() {
    try {
      this.isFavorite = await this.filmesService.isFavorite(this.movie.id);
      console.log(
        'Estado favorito inicial:',
        this.isFavorite,
        'para filme:',
        this.movie.id
      );
      this.cdr.detectChanges(); // Força detecção de mudanças
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
      this.isFavorite = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Atualiza o estado de favorito e força detecção de mudanças
   */
  private updateFavoriteState(newState: boolean) {
    this.isFavorite = newState;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    console.log('Estado atualizado para:', this.isFavorite);
  }
  /**
   * Alterna estado de favorito
   */
  async toggleFavorite() {
    if (this.isProcessingFavorite) return;

    this.isProcessingFavorite = true;

    console.log(
      'Estado antes de alterar:',
      this.isFavorite,
      'para filme:',
      this.movie.id
    );

    try {
      if (this.isFavorite) {
        await this.filmesService.removeFromFavorites(this.movie.id);
        this.updateFavoriteState(false);
        console.log('Removido dos favoritos. Novo estado:', this.isFavorite);
        await this.showToast('Removido dos favoritos', 'danger');
      } else {
        await this.filmesService.addToFavorites(this.movie);
        this.updateFavoriteState(true);
        console.log('Adicionado aos favoritos. Novo estado:', this.isFavorite);
        await this.showToast('Adicionado aos favoritos!', 'success');
      }
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
      await this.showToast('Erro ao alterar favorito', 'danger');
    } finally {
      this.isProcessingFavorite = false;
      // Força detecção de mudanças novamente
      this.cdr.detectChanges();
    }
  }

  /**
   * Mostra toast de feedback
   */
  private async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle' : 'close-circle',
    });
    await toast.present();
  }

  /**
   * Obtém título do filme
   */
  getTitle(): string {
    return this.movie.title || this.movie.name || 'Título não disponível';
  }

  /**
   * Obtém título original se diferente do principal
   */
  getOriginalTitle(): string | null {
    const title = this.getTitle();
    const originalTitle = this.movie.original_title || this.movie.name;

    if (originalTitle && originalTitle !== title) {
      return originalTitle;
    }
    return null;
  }

  /**
   * Obtém URL do poster
   */
  getPosterUrl(): string {
    return this.filmesService.getImageUrl(this.movie.poster_path, 'w500');
  }

  /**
   * Obtém rating formatado
   */
  getRating(): string {
    return this.movie.vote_average ? this.movie.vote_average.toFixed(1) : 'N/A';
  }

  /**
   * Obtém classe de cor do rating
   */
  getRatingColor(): string {
    if (!this.movie.vote_average) return 'rating-na';
    if (this.movie.vote_average >= 8) return 'rating-excellent';
    if (this.movie.vote_average >= 7) return 'rating-good';
    if (this.movie.vote_average >= 5) return 'rating-average';
    return 'rating-poor';
  }

  /**
   * Obtém ano de lançamento
   */
  getReleaseYear(): string | null {
    const date = this.movie.release_date || this.movie.first_air_date;
    return date ? new Date(date).getFullYear().toString() : null;
  }

  /**
   * Obtém data de lançamento
   */
  getReleaseDate(): string | null {
    return this.movie.release_date || this.movie.first_air_date || null;
  }

  /**
   * Obtém data de lançamento formatada
   */
  getFormattedReleaseDate(): string {
    const date = this.getReleaseDate();
    if (!date) return 'Data não disponível';

    return new Date(date).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  /**
   * Obtém tipo de mídia
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
   * Obtém cor do tipo de mídia
   */
  getMediaTypeColor(): string {
    // Prioriza media_type se disponível
    if (this.movie.media_type === 'movie') return 'primary';
    if (this.movie.media_type === 'tv') return 'secondary';

    // Fallback baseado na presença de campos específicos
    if (this.movie.title && !this.movie.name) return 'primary';
    if (this.movie.name && !this.movie.title) return 'secondary';
    if (this.movie.first_air_date) return 'secondary';
    if (this.movie.release_date) return 'primary';

    return 'medium';
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
   * Obtém nome do idioma
   */
  getLanguageName(): string {
    const languageMap: { [key: string]: string } = {
      en: 'Inglês',
      pt: 'Português',
      es: 'Espanhol',
      fr: 'Francês',
      de: 'Alemão',
      it: 'Italiano',
      ja: 'Japonês',
      ko: 'Coreano',
      zh: 'Chinês',
      ru: 'Russo',
      ar: 'Árabe',
      hi: 'Hindi',
    };

    return (
      languageMap[this.movie.original_language] ||
      this.movie.original_language?.toUpperCase() ||
      'Não disponível'
    );
  }

  /**
   * Re-verifica o estado de favoritos (útil para sincronização)
   */
  async refreshFavoriteStatus() {
    await this.checkIfFavorite();
  }
}
