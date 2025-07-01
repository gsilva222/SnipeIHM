import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonDatetime,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonCheckbox,
  IonAvatar,
  IonChip,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  saveOutline,
  calendarOutline,
  timeOutline,
  filmOutline,
  notificationsOutline,
  checkmarkCircle,
  searchOutline,
  heart,
  starOutline,
} from 'ionicons/icons';

import {
  MovieReminder,
  CreateReminderRequest,
} from '../../models/reminder.model';
import { ReminderService } from '../../services/reminder.service';
import { NotificationService } from '../../services/notification.service';
import { FilmesService } from '../../services/filmes.service';

@Component({
  selector: 'app-create-reminder-modal',
  templateUrl: './create-reminder-modal.component.html',
  styleUrls: ['./create-reminder-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonIcon,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonDatetime,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonCheckbox,
    IonAvatar,
    IonChip,
  ],
})
export class CreateReminderModalComponent implements OnInit {
  @Input() editingReminder?: MovieReminder;
  @Input() prefilledMovie?: { title: string; poster?: string };

  reminderForm!: FormGroup;
  isEditing = false;
  loading = false;
  notificationPermission = false;
  favoriteMovies: any[] = [];
  filteredMovies: any[] = [];
  showMovieSearch = false;
  minDate: string;
  // Opções predefinidas
  quickMessages = [
    'Hora do Filme! 🍿',
    'Não esqueça de assistir este filme!',
    'Sessão de cinema em casa!',
    'Filme na watchlist pronto para assistir',
    'Tempo de relaxar com um bom filme',
  ];

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private formBuilder: FormBuilder,
    private reminderService: ReminderService,
    private notificationService: NotificationService,
    private filmesService: FilmesService
  ) {
    addIcons({
      filmOutline,
      close,
      starOutline,
      heart,
      notificationsOutline,
      checkmarkCircle,
      searchOutline,
      calendarOutline,
      saveOutline,
      timeOutline,
    });

    // Inicializar data mínima (hoje) - valor fixo para evitar ExpressionChangedAfterItHasBeenCheckedError
    this.minDate = new Date().toISOString();
    this.initializeForm();
  }

  async ngOnInit() {
    this.isEditing = !!this.editingReminder;
    await this.checkNotificationPermission();
    await this.loadFavoriteMovies();

    if (this.editingReminder) {
      this.populateFormWithReminder();
    } else if (this.prefilledMovie) {
      this.populateFormWithMovie();
    }
  }

  /**
   * Carrega lista de filmes favoritos
   */
  private async loadFavoriteMovies(): Promise<void> {
    try {
      const favorites = await this.filmesService.getFavorites();
      this.favoriteMovies = favorites || [];
      this.filteredMovies = [...this.favoriteMovies];
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
      this.favoriteMovies = [];
      this.filteredMovies = [];
    }
  }
  /**
   * Inicializa o formulário
   */
  private initializeForm(): void {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    this.reminderForm = this.formBuilder.group({
      movieTitle: ['', [Validators.required, Validators.minLength(1)]],
      moviePoster: [''],
      reminderDate: [tomorrow.toISOString(), [Validators.required]],
      reminderTime: ['20:00', [Validators.required]],
      message: ['Hora do Filme! 🍿', [Validators.maxLength(200)]],
      customMessage: [false],
    });
  }

  /**
   * Verifica permissões de notificação
   */
  private async checkNotificationPermission(): Promise<void> {
    try {
      const status = await this.notificationService.checkPermissions();
      this.notificationPermission = status.display === 'granted';
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      this.notificationPermission = false;
    }
  }

  /**
   * Popula formulário com dados do lembrete em edição
   */
  private populateFormWithReminder(): void {
    if (!this.editingReminder) return;

    this.reminderForm.patchValue({
      movieTitle: this.editingReminder.movieTitle,
      moviePoster: this.editingReminder.moviePoster,
      reminderDate: this.editingReminder.reminderDate.toISOString(),
      reminderTime: this.editingReminder.reminderTime,
      message: this.editingReminder.message,
      customMessage: true,
    });
  }
  /**
   * Popula formulário com dados do filme pré-selecionado
   */
  private populateFormWithMovie(): void {
    if (!this.prefilledMovie) return;

    this.reminderForm.patchValue({
      movieTitle: this.prefilledMovie.title,
      moviePoster: this.prefilledMovie.poster,
      message: 'Hora do Filme! 🍿',
    });
  }

  /**
   * Filtra filmes favoritos baseado na busca
   */
  filterMovies(event: any): void {
    const searchTerm = event.target.value?.toLowerCase() || '';

    if (searchTerm.trim() === '') {
      this.filteredMovies = [...this.favoriteMovies];
    } else {
      this.filteredMovies = this.favoriteMovies.filter(
        (movie) =>
          movie.title?.toLowerCase().includes(searchTerm) ||
          movie.original_title?.toLowerCase().includes(searchTerm)
      );
    }
  }
  /**
   * Seleciona um filme da lista de favoritos
   */
  selectMovie(movie: any): void {
    this.reminderForm.patchValue({
      movieTitle: movie.title || movie.original_title,
      moviePoster: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : '',
      message: 'Hora do Filme! 🍿',
      customMessage: false,
    });
    this.showMovieSearch = false;
  }

  /**
   * Toggle busca de filmes
   */
  toggleMovieSearch(): void {
    this.showMovieSearch = !this.showMovieSearch;
    if (this.showMovieSearch) {
      this.filteredMovies = [...this.favoriteMovies];
    }
  }

  /**
   * Solicita permissões de notificação
   */
  async requestNotificationPermission(): Promise<void> {
    try {
      const status = await this.notificationService.requestPermissions();
      this.notificationPermission = status.display === 'granted';

      if (this.notificationPermission) {
        await this.showToast('Permissões concedidas!', 'success');
      } else {
        await this.showToast(
          'Permissões negadas. Você pode alterar nas configurações.',
          'warning'
        );
      }
    } catch (error) {
      await this.showToast('Erro ao solicitar permissões', 'danger');
    }
  }
  /**
   * Define mensagem rápida
   */
  setQuickMessage(message: string): void {
    this.reminderForm.patchValue({
      message,
      customMessage: true,
    });
  }

  /**
   * Salva o lembrete
   */ async saveReminder(): Promise<void> {
    // Verificar se há filmes nos favoritos
    if (this.favoriteMovies.length === 0) {
      await this.showToast(
        'É necessário adicionar filmes aos favoritos antes de criar um lembrete',
        'warning'
      );
      return;
    }

    if (this.reminderForm.invalid) {
      await this.showToast(
        'Por favor, preencha todos os campos obrigatórios',
        'warning'
      );
      return;
    }

    if (!this.notificationPermission) {
      await this.showToast(
        'É necessário permitir notificações para criar lembretes',
        'warning'
      );
      return;
    }

    this.loading = true;

    try {
      const formValue = this.reminderForm.value;

      // Validar data no futuro
      const reminderDateTime = new Date(formValue.reminderDate);
      const [hours, minutes] = formValue.reminderTime.split(':').map(Number);
      reminderDateTime.setHours(hours, minutes, 0, 0);

      // Adicionar margem de segurança para evitar problemas de timezone e processamento
      const currentTime = new Date();
      const minimumTime = new Date(currentTime.getTime() + 60 * 1000); // 1 minuto no futuro

      if (reminderDateTime.getTime() <= minimumTime.getTime()) {
        await this.showToast(
          'A data do lembrete deve ser pelo menos 1 minuto no futuro',
          'warning'
        );
        this.loading = false;
        return;
      }

      if (this.isEditing && this.editingReminder) {
        // Atualizar lembrete existente
        await this.reminderService.updateReminder(this.editingReminder.id, {
          movieTitle: formValue.movieTitle,
          moviePoster: formValue.moviePoster,
          reminderDate: new Date(formValue.reminderDate),
          reminderTime: formValue.reminderTime,
          message: formValue.message,
        });
      } else {
        // Criar novo lembrete
        const request: CreateReminderRequest = {
          movieTitle: formValue.movieTitle,
          moviePoster: formValue.moviePoster,
          reminderDate: new Date(formValue.reminderDate),
          reminderTime: formValue.reminderTime,
          message: formValue.message,
        };

        await this.reminderService.createReminder(request);
      }
      await this.modalController.dismiss({
        reminder: formValue,
      });

      await this.showToast(
        this.isEditing
          ? 'Lembrete atualizado com sucesso!'
          : 'Lembrete criado com sucesso!',
        'success'
      );
    } catch (error: unknown) {
      console.error('Erro ao salvar lembrete:', error);

      // Mensagem mais específica baseada no tipo de erro
      let errorMessage = 'Ocorreu um erro ao salvar o lembrete. ';

      if (error instanceof Error) {
        if (error.message.includes('favorites')) {
          errorMessage =
            'O filme precisa estar nos favoritos para criar um lembrete.';
        } else if (error.message.includes('notification')) {
          errorMessage =
            'Não foi possível agendar a notificação. Verifique as permissões.';
        } else {
          errorMessage += 'Por favor, tente novamente.';
        }
      } else {
        errorMessage += 'Por favor, tente novamente.';
      }

      await this.showToast(errorMessage, 'danger');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Fecha o modal
   */
  async closeModal(): Promise<void> {
    await this.modalController.dismiss();
  }

  /**
   * Mostra toast de feedback
   */
  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  /**
   * Getters para validação do formulário
   */
  get movieTitle() {
    return this.reminderForm.get('movieTitle');
  }
  get reminderDate() {
    return this.reminderForm.get('reminderDate');
  }
  get reminderTime() {
    return this.reminderForm.get('reminderTime');
  }
  get message() {
    return this.reminderForm.get('message');
  }
}
