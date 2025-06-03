import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonFab,
  IonFabButton,
  IonChip,
  IonAvatar,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonBadge,
  ModalController,
  AlertController,
  ToastController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  timeOutline,
  calendarOutline,
  notificationsOutline,
  settingsOutline,
  trashOutline,
  createOutline,
  filmOutline,
  tvOutline,
  playOutline,
  alarmOutline,
  listOutline,
  gridOutline,
  chevronDown,
  searchOutline,
} from 'ionicons/icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MovieReminder } from '../../models/reminder.model';
import { ReminderService } from '../../services/reminder.service';
import { NotificationService } from '../../services/notification.service';
import { CreateReminderModalComponent } from '../../components/create-reminder-modal/create-reminder-modal.component';
import { NotificationSettingsModalComponent } from '../../components/notification-settings-modal/notification-settings-modal.component';

@Component({
  selector: 'app-reminders',
  templateUrl: './reminders.page.html',
  styleUrls: ['./reminders.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonCard,
    IonCardTitle,
    IonCardContent,
    IonFab,
    IonFabButton,
    IonChip,
    IonAvatar,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonBadge,
  ],
})
export class RemindersPage implements OnInit, OnDestroy {
  reminders: MovieReminder[] = [];
  filteredReminders: MovieReminder[] = [];
  searchTerm: string = '';
  selectedSegment: string = 'all';
  viewMode: 'list' | 'grid' = 'list';

  private destroy$ = new Subject<void>();

  constructor(
    private reminderService: ReminderService,
    private notificationService: NotificationService,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({
      alarmOutline,
      settingsOutline,
      notificationsOutline,
      trashOutline,
      add,
      searchOutline,
      timeOutline,
      createOutline,
      calendarOutline,
      filmOutline,
      tvOutline,
      playOutline,
      listOutline,
      gridOutline,
      chevronDown,
    });
  }

  ngOnInit() {
    this.loadReminders();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carrega lembretes do serviço
   */
  private loadReminders(): void {
    this.reminderService.reminders$
      .pipe(takeUntil(this.destroy$))
      .subscribe((reminders) => {
        this.reminders = reminders.sort((a, b) => {
          const aDateTime = this.getReminderDateTime(a);
          const bDateTime = this.getReminderDateTime(b);
          return aDateTime.getTime() - bDateTime.getTime();
        });
        this.filterReminders();
      });
  }

  /**
   * Filtra lembretes baseado no termo de busca e segmento selecionado
   */
  filterReminders(): void {
    let filtered = [...this.reminders];

    // Filtrar por termo de busca
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (reminder) =>
          reminder.movieTitle.toLowerCase().includes(term) ||
          reminder.message.toLowerCase().includes(term)
      );
    }

    // Filtrar por segmento
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    switch (this.selectedSegment) {
      case 'today':
        filtered = filtered.filter((reminder) => {
          const reminderDate = new Date(reminder.reminderDate);
          const reminderDay = new Date(
            reminderDate.getFullYear(),
            reminderDate.getMonth(),
            reminderDate.getDate()
          );
          return reminderDay.getTime() === today.getTime();
        });
        break;
      case 'upcoming':
        filtered = filtered.filter((reminder) => {
          const reminderDateTime = this.getReminderDateTime(reminder);
          return reminderDateTime.getTime() >= tomorrow.getTime();
        });
        break;
      case 'past':
        filtered = filtered.filter((reminder) => {
          const reminderDateTime = this.getReminderDateTime(reminder);
          return reminderDateTime.getTime() < now.getTime();
        });
        break;
    }

    this.filteredReminders = filtered;
  }

  /**
   * Manipula mudança no termo de busca
   */
  onSearchChange(event: any): void {
    this.searchTerm = event.detail.value || '';
    this.filterReminders();
  }

  /**
   * Manipula mudança no segmento
   */
  onSegmentChange(event: any): void {
    this.selectedSegment = event.detail.value;
    this.filterReminders();
  }

  /**
   * Alterna modo de visualização
   */
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
  }

  /**
   * Abre modal para criar novo lembrete
   */
  async openCreateReminderModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: CreateReminderModalComponent,
      cssClass: 'create-reminder-modal',
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.reminder) {
      await this.showToast('Lembrete criado com sucesso!', 'success');
    }
  }

  /**
   * Abre modal de configurações de notificação
   */
  async openNotificationSettings(): Promise<void> {
    const modal = await this.modalController.create({
      component: NotificationSettingsModalComponent,
      cssClass: 'notification-settings-modal',
    });

    await modal.present();
  }

  /**
   * Edita um lembrete
   */
  async editReminder(reminder: MovieReminder): Promise<void> {
    const modal = await this.modalController.create({
      component: CreateReminderModalComponent,
      componentProps: {
        editingReminder: reminder,
      },
      cssClass: 'create-reminder-modal',
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.reminder) {
      await this.showToast('Lembrete atualizado com sucesso!', 'success');
    }
  }

  /**
   * Remove um lembrete com confirmação
   */
  async deleteReminder(reminder: MovieReminder): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: `Tem certeza que deseja remover o lembrete para "${reminder.movieTitle}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Remover',
          role: 'destructive',
          handler: async () => {
            try {
              await this.reminderService.removeReminder(reminder.id);
              await this.showToast('Lembrete removido com sucesso!', 'success');
            } catch (error) {
              await this.showToast('Erro ao remover lembrete', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Remove todos os lembretes com confirmação
   */
  async clearAllReminders(): Promise<void> {
    if (this.reminders.length === 0) {
      await this.showToast('Não há lembretes para remover', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: `Tem a certeza que deseja remover todos os ${this.reminders.length} lembretes?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Remover Todos',
          role: 'destructive',
          handler: async () => {
            try {
              await this.reminderService.clearAllReminders();
              await this.showToast(
                'Todos os lembretes foram removidos!',
                'success'
              );
            } catch (error) {
              await this.showToast('Erro ao remover lembretes', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Testa notificações
   */
  async testNotification(): Promise<void> {
    try {
      await this.notificationService.testNotification();
      await this.showToast(
        'Notificação de teste enviada! Verifique em alguns segundos.',
        'success'
      );
    } catch (error) {
      await this.showToast('Erro ao testar notificação', 'danger');
    }
  }

  /**
   * Refresh da página
   */
  async handleRefresh(event: RefresherCustomEvent): Promise<void> {
    this.loadReminders();
    event.target.complete();
  }

  /**
   * Obtém data/hora completa do lembrete
   */
  getReminderDateTime(reminder: MovieReminder): Date {
    const reminderDateTime = new Date(reminder.reminderDate);
    const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
    reminderDateTime.setHours(hours, minutes, 0, 0);
    return reminderDateTime;
  }

  /**
   * Obtém ícone do tipo de mídia
   */
  getMediaTypeIcon(reminder: MovieReminder): string {
    // Esta lógica pode ser melhorada baseado em dados adicionais
    return 'film-outline'; // Por enquanto, retorna ícone de filme
  }

  /**
   * Obtém cor do status do lembrete
   */
  getReminderStatusColor(reminder: MovieReminder): string {
    const now = new Date();
    const reminderDateTime = this.getReminderDateTime(reminder);
    const diff = reminderDateTime.getTime() - now.getTime();

    if (diff < 0) return 'danger'; // Expirado
    if (diff < 60 * 60 * 1000) return 'warning'; // Menos de 1 hora
    if (diff < 24 * 60 * 60 * 1000) return 'primary'; // Menos de 24 horas
    return 'success'; // Futuro
  }

  /**
   * Obtém texto do tempo restante formatado
   */
  getTimeUntilReminder(reminder: MovieReminder): string {
    return this.reminderService.getTimeUntilReminder(reminder);
  }

  /**
   * Obtém data formatada do lembrete
   */
  getFormattedReminderDate(reminder: MovieReminder): string {
    return this.reminderService.formatReminderDate(reminder);
  }

  /**
   * Obtém contadores para os segmentos
   */
  getTodayCount(): number {
    const today = new Date();
    const todayStr = today.toDateString();
    return this.reminders.filter(
      (r) => new Date(r.reminderDate).toDateString() === todayStr
    ).length;
  }

  getUpcomingCount(): number {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return this.reminders.filter((r) => {
      const reminderDateTime = this.getReminderDateTime(r);
      return reminderDateTime.getTime() >= tomorrow.getTime();
    }).length;
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
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  /**
   * Track function para ngFor otimização
   */
  trackByReminderId(index: number, reminder: MovieReminder): string {
    return reminder.id;
  }
}
