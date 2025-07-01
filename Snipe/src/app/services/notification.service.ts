import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  Schedule,
  ActionPerformed,
  LocalNotificationSchema,
  PermissionStatus,
} from '@capacitor/local-notifications';
import { MovieReminder, NotificationSettings } from '../models/reminder.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly STORAGE_KEY = 'notification_settings';
  private readonly REMINDERS_KEY = 'movie_reminders';

  private defaultSettings: NotificationSettings = {
    enabled: true,
    sound: true,
    vibration: true,
    reminderMinutesBefore: 30,
  };

  constructor() {
    this.initializeNotifications();
  }

  /**
   * Inicializa o serviço de notificações
   */
  private async initializeNotifications(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // Pedir permissões
      await this.requestPermissions();

      // Configurar listeners para ações de notificação
      await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (notification: ActionPerformed) => {
          console.log('Notificação acionada:', notification);
        }
      );
    } else {
      console.log(
        '🌐 Modo desenvolvimento - Notificações simuladas no browser'
      );
    }
  }

  /**
   * Verifica se está rodando no browser (modo desenvolvimento)
   */
  private isWebPlatform(): boolean {
    return !Capacitor.isNativePlatform();
  }

  /**
   * Solicita permissões para notificações
   */
  async requestPermissions(): Promise<PermissionStatus> {
    const permissions = await LocalNotifications.requestPermissions();
    console.log('Permissões de notificação:', permissions);
    return permissions;
  }

  /**
   * Verifica se as notificações estão habilitadas
   */
  async checkPermissions(): Promise<PermissionStatus> {
    if (this.isWebPlatform()) {
      // Simular permissões no browser
      console.log('🌐 Simulando permissões no browser - sempre permitidas');
      return { display: 'granted' };
    }
    return await LocalNotifications.checkPermissions();
  }

  /**
   * Agenda uma notificação para um lembrete de filme
   */
  async scheduleMovieReminder(reminder: MovieReminder): Promise<number> {
    try {
      const settings = await this.getNotificationSettings();

      if (!settings.enabled) {
        throw new Error('Notificações estão desabilitadas');
      }

      // Calcular o timestamp da notificação
      const reminderDateTime = new Date(reminder.reminderDate);
      const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
      reminderDateTime.setHours(hours, minutes, 0, 0);

      // Subtrair os minutos de antecedência configurados
      const notificationTime = new Date(
        reminderDateTime.getTime() - settings.reminderMinutesBefore * 60 * 1000
      );

      // Verificar se a data não é no passado (com margem de segurança)
      const currentTime = new Date();
      const minimumTime = new Date(currentTime.getTime() + 30 * 1000); // 30 segundos no futuro

      if (notificationTime.getTime() <= minimumTime.getTime()) {
        throw new Error('A data do lembrete deve ser no futuro');
      }

      const notificationId = Date.now(); // ID único baseado no timestamp

      const notification: LocalNotificationSchema = {
        id: notificationId,
        title: '🎬 Lembrete de Filme',
        body: `${
          reminder.message || `Não esqueça de assistir "${reminder.movieTitle}"`
        }`,
        schedule: {
          at: notificationTime,
        },
        sound: settings.sound ? 'beep.wav' : undefined,
        attachments: reminder.moviePoster
          ? [
              {
                id: 'poster',
                url: reminder.moviePoster,
                options: {
                  iosUNNotificationAttachmentOptionsTypeHintKey: 'public.jpeg',
                },
              },
            ]
          : undefined,
        actionTypeId: 'MOVIE_REMINDER',
        extra: {
          reminderId: reminder.id,
          movieTitle: reminder.movieTitle,
        },
      };

      // Verificar se está no browser (modo desenvolvimento)
      if (this.isWebPlatform()) {
        console.log('🌐 SIMULAÇÃO NO BROWSER 🌐');
        console.log('📅 Lembrete que seria agendado:');
        console.log(`🎬 Filme: ${reminder.movieTitle}`);
        console.log(`⏰ Data/Hora: ${reminderDateTime.toLocaleString()}`);
        console.log(`🔔 Notificação em: ${notificationTime.toLocaleString()}`);
        console.log(
          `💬 Mensagem: ${
            reminder.message ||
            `Não esqueça de assistir "${reminder.movieTitle}"`
          }`
        );

        // Simular ID de notificação
        return Date.now();
      }

      await LocalNotifications.schedule({
        notifications: [notification],
      });

      console.log(
        `Notificação agendada para ${notificationTime.toLocaleString()}`
      );
      return notificationId;
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      throw error;
    }
  }

  /**
   * Cancela uma notificação específica
   */
  async cancelNotification(notificationId: number): Promise<void> {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }],
      });
      console.log(`Notificação ${notificationId} cancelada`);
    } catch (error) {
      console.error('Erro ao cancelar notificação:', error);
      throw error;
    }
  }

  /**
   * Lista todas as notificações pendentes
   */
  async getPendingNotifications() {
    try {
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      console.error('Erro ao buscar notificações pendentes:', error);
      return [];
    }
  }

  /**
   * Cancela todas as notificações
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      const pending = await this.getPendingNotifications();
      if (pending.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.map((n) => ({ id: n.id })),
        });
      }
      console.log('Todas as notificações foram canceladas');
    } catch (error) {
      console.error('Erro ao cancelar todas as notificações:', error);
      throw error;
    }
  }

  /**
   * Obtém as configurações de notificação do usuário
   */
  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...this.defaultSettings, ...JSON.parse(stored) };
      }
      return this.defaultSettings;
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Salva as configurações de notificação
   */
  async saveNotificationSettings(
    settings: NotificationSettings
  ): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      console.log('Configurações de notificação salvas:', settings);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      throw error;
    }
  }

  /**
   * Testa uma notificação imediata
   */
  async testNotification(): Promise<void> {
    try {
      const testNotification: LocalNotificationSchema = {
        id: 99999,
        title: '🎬 Teste - Snipe',
        body: 'Esta é uma notificação de teste!',
        schedule: {
          at: new Date(Date.now() + 3000), // 3 segundos no futuro
        },
        sound: 'beep.wav',
      };

      await LocalNotifications.schedule({
        notifications: [testNotification],
      });

      console.log('Notificação de teste agendada');
    } catch (error) {
      console.error('Erro ao testar notificação:', error);
      throw error;
    }
  }
}
