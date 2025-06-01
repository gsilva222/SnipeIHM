import { Component, Input, OnInit, OnDestroy } from '@angular/core';
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
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
    }
  }

  /**
   * Alterna estado de favorito
   */
  async toggleFavorite() {
    if (this.isProcessingFavorite) return;

    this.isProcessingFavorite = true;

    try {
      if (this.isFavorite) {
        await this.filmesService.removeFromFavorites(this.movie.id);
        this.isFavorite = false;
        await this.showToast('Removido dos favoritos', 'danger');
      } else {
        await this.filmesService.addToFavorites(this.movie);
        this.isFavorite = true;
        await this.showToast('Adicionado aos favoritos!', 'success');
      }
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
      await this.showToast('Erro ao alterar favorito', 'danger');
    } finally {
      this.isProcessingFavorite = false;
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
    if (this.movie.media_type === 'tv') return 'Série';
    if (this.movie.media_type === 'movie') return 'Filme';
    return this.movie.title ? 'Filme' : 'Série';
  }

  /**
   * Obtém cor do tipo de mídia
   */
  getMediaTypeColor(): string {
    return this.movie.media_type === 'tv' || !this.movie.title
      ? 'secondary'
      : 'primary';
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
   * Obtém data de adição aos favoritos formatada
   */
  getDateAdded(): string {
    if (!this.movie.dataAdicionado) return '';

    return new Date(this.movie.dataAdicionado).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
