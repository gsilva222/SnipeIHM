import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
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
  IonToggle,
  IonRange,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSelect,
  IonSelectOption,
  IonList,
  IonListHeader,
  IonNote,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  saveOutline,
  notificationsOutline,
  volumeHighOutline,
  phonePortraitOutline,
  timeOutline,
  checkmarkCircle,
  informationCircleOutline,
  settingsOutline,
  closeCircle,
} from 'ionicons/icons';

import { NotificationSettings } from '../../models/reminder.model';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-settings-modal',
  templateUrl: './notification-settings-modal.component.html',
  styleUrls: ['./notification-settings-modal.component.scss'],
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
    IonToggle,
    IonRange,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonNote,
  ],
})
export class NotificationSettingsModalComponent implements OnInit {
  settingsForm!: FormGroup;
  loading = false;
  hasPermission = false;
  pendingNotifications = 0;

  // Opções predefinidas
  reminderOptions = [
    { label: 'No horário exato', value: 0 },
    { label: '5 minutos antes', value: 5 },
    { label: '10 minutos antes', value: 10 },
    { label: '15 minutos antes', value: 15 },
    { label: '30 minutos antes', value: 30 },
    { label: '1 hora antes', value: 60 },
    { label: '2 horas antes', value: 120 },
    { label: '1 dia antes', value: 1440 },
  ];

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService
  ) {
    addIcons({
      settingsOutline,
      close,
      notificationsOutline,
      checkmarkCircle,
      informationCircleOutline,
      volumeHighOutline,
      phonePortraitOutline,
      timeOutline,
      closeCircle,
      saveOutline,
    });

    this.initializeForm();
  }

  async ngOnInit() {
    await this.loadSettings();
    await this.checkPermissionStatus();
    await this.loadPendingNotifications();
  }

  /**
   * Inicializa o formulário
   */
  private initializeForm(): void {
    this.settingsForm = this.formBuilder.group({
      enabled: [true],
      sound: [true],
      vibration: [true],
      reminderMinutesBefore: [0],
    });
  }

  /**
   * Carrega configurações atuais
   */
  private async loadSettings(): Promise<void> {
    try {
      const settings = await this.notificationService.getNotificationSettings();
      this.settingsForm.patchValue(settings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }

  /**
   * Verifica status das permissões
   */
  private async checkPermissionStatus(): Promise<void> {
    try {
      const status = await this.notificationService.checkPermissions();
      this.hasPermission = status.display === 'granted';
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      this.hasPermission = false;
    }
  }

  /**
   * Carrega número de notificações pendentes
   */ private async loadPendingNotifications(): Promise<void> {
    try {
      const pending = await this.notificationService.getPendingNotifications();
      this.pendingNotifications = pending.length;
    } catch (error) {
      console.error('Erro ao carregar notificações pendentes:', error);
      this.pendingNotifications = 0;
    }
  }

  /**
   * Solicita permissões de notificação
   */
  async requestPermissions(): Promise<void> {
    try {
      const status = await this.notificationService.requestPermissions();
      this.hasPermission = status.display === 'granted';

      if (this.hasPermission) {
        await this.showToast('Permissões concedidas com sucesso!', 'success');
        // Ativar notificações automaticamente quando permissão é concedida
        this.settingsForm.patchValue({ enabled: true });
      } else {
        await this.showToast(
          'Permissões negadas. Verifique as configurações do sistema.',
          'warning'
        );
        this.settingsForm.patchValue({ enabled: false });
      }
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      await this.showToast('Erro ao solicitar permissões', 'danger');
    }
  }

  /**
   * Testa notificação
   */
  async testNotification(): Promise<void> {
    if (!this.hasPermission) {
      await this.showToast(
        'Permissões de notificação são necessárias',
        'warning'
      );
      return;
    }

    try {
      await this.notificationService.testNotification();
      await this.showToast('Notificação de teste enviada!', 'success');
    } catch (error) {
      console.error('Erro ao testar notificação:', error);
      await this.showToast('Erro ao enviar notificação de teste', 'danger');
    }
  }

  /**
   * Cancela todas as notificações pendentes
   */
  async cancelAllNotifications(): Promise<void> {
    if (this.pendingNotifications === 0) {
      await this.showToast('Não há notificações pendentes', 'warning');
      return;
    }

    try {
      await this.notificationService.cancelAllNotifications();
      this.pendingNotifications = 0;
      await this.showToast('Todas as notificações foram canceladas', 'success');
    } catch (error) {
      console.error('Erro ao cancelar notificações:', error);
      await this.showToast('Erro ao cancelar notificações', 'danger');
    }
  }

  /**
   * Salva as configurações
   */
  async saveSettings(): Promise<void> {
    if (!this.hasPermission && this.settingsForm.value.enabled) {
      await this.showToast(
        'Solicite permissões antes de ativar notificações',
        'warning'
      );
      return;
    }

    this.loading = true;

    try {
      const settings: NotificationSettings = this.settingsForm.value;
      await this.notificationService.saveNotificationSettings(settings);

      await this.modalController.dismiss({
        settings: settings,
      });

      await this.showToast('Configurações salvas com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      await this.showToast('Erro ao salvar configurações', 'danger');
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
   * Obtém texto formatado do tempo de antecedência
   */
  getReminderTimeText(minutes: number): string {
    if (minutes === 0) {
      return 'no horário exato';
    }
    
    if (minutes < 60) {
      return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hora${hours > 1 ? 's' : ''}`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Getters para o formulário
   */
  get enabled() {
    return this.settingsForm.get('enabled')?.value;
  }
  get sound() {
    return this.settingsForm.get('sound')?.value;
  }
  get vibration() {
    return this.settingsForm.get('vibration')?.value;
  }
  get reminderMinutesBefore() {
    return this.settingsForm.get('reminderMinutesBefore')?.value;
  }
}
