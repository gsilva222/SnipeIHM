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
    reminderMinutesBefore: 0,
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
   * Verifica permissões de forma mais robusta para dispositivos móveis
   */
  async ensurePermissions(): Promise<boolean> {
    try {
      console.log('🔵 Verificando permissões de notificação...');
      
      if (this.isWebPlatform()) {
        console.log('🌐 Web platform - permissões simuladas');
        return true;
      }

      // Primeiro verificar se já temos permissões
      const currentPermissions = await LocalNotifications.checkPermissions();
      console.log('🔵 Permissões atuais:', currentPermissions);

      if (currentPermissions.display === 'granted') {
        console.log('✅ Permissões já concedidas');
        return true;
      }

      // Se não temos permissões, tentar solicitar
      console.log('🔵 Solicitando permissões...');
      const requestedPermissions = await LocalNotifications.requestPermissions();
      console.log('🔵 Resultado da solicitação:', requestedPermissions);

      const hasPermissions = requestedPermissions.display === 'granted';
      console.log(hasPermissions ? '✅ Permissões concedidas' : '❌ Permissões negadas');
      
      return hasPermissions;
    } catch (error) {
      console.error('❌ Erro ao verificar/solicitar permissões:', error);
      return false;
    }
  }

  /**
   * Agenda uma notificação para um lembrete de filme
   */
  async scheduleMovieReminder(reminder: MovieReminder): Promise<number> {
    try {
      console.log('🔵 Iniciando agendamento de notificação:', {
        movieTitle: reminder.movieTitle,
        reminderDate: reminder.reminderDate,
        reminderTime: reminder.reminderTime,
        platform: Capacitor.getPlatform()
      });

      const settings = await this.getNotificationSettings();
      console.log('🔵 Configurações carregadas:', settings);

      if (!settings.enabled) {
        throw new Error('As notificações estão desabilitadas. Ative as notificações nas configurações para criar lembretes.');
      }

      // Verificar permissões primeiro de forma robusta
      const hasPermissions = await this.ensurePermissions();
      if (!hasPermissions) {
        throw new Error('Permissões de notificação não concedidas. Ative as notificações nas configurações do dispositivo.');
      }

      // Calcular o timestamp da notificação
      const reminderDateTime = new Date(reminder.reminderDate);
      const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
      reminderDateTime.setHours(hours, minutes, 0, 0);
      console.log('🔵 Data/hora calculada:', reminderDateTime.toISOString());

      // A notificação será enviada no horário exato escolhido pelo usuário
      const notificationTime = reminderDateTime;

      // Verificar se a data não é no passado (com margem de segurança mínima)
      const currentTime = new Date();
      const minimumTime = new Date(currentTime.getTime() + 30 * 1000); // 30 segundos no futuro

      if (reminderDateTime.getTime() <= minimumTime.getTime()) {
        const now = new Date();
        const timeNow = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        const dateNow = now.toLocaleDateString('pt-PT');
        const selectedTime = reminderDateTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        const selectedDate = reminderDateTime.toLocaleDateString('pt-PT');
        
        if (selectedDate === dateNow) {
          throw new Error(`O horário selecionado (${selectedTime}) já passou. Agora são ${timeNow}. Escolha um horário futuro ou uma data posterior.`);
        } else {
          throw new Error(`A data e horário selecionados (${selectedDate} às ${selectedTime}) já passaram. Escolha uma data e horário futuros.`);
        }
      }

      // Gerar um ID compatível com Android (32-bit integer)
      const notificationId = Math.floor(Math.random() * 2147483647); // Max 32-bit signed integer
      console.log('🔵 ID da notificação gerado:', notificationId);

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
        // Remover attachments para testar se está a causar problemas
        // attachments: reminder.moviePoster
        //   ? [
        //       {
        //         id: 'poster',
        //         url: reminder.moviePoster,
        //         options: {
        //           iosUNNotificationAttachmentOptionsTypeHintKey: 'public.jpeg',
        //         },
        //       },
        //     ]
        //   : undefined,
        actionTypeId: 'MOVIE_REMINDER',
        extra: {
          reminderId: reminder.id,
          movieTitle: reminder.movieTitle,
        },
      };

      console.log('🔵 Notificação preparada:', {
        id: notification.id,
        title: notification.title,
        scheduleTime: notificationTime.toISOString(),
        platform: Capacitor.getPlatform()
      });

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

      // Tentar agendar a notificação
      console.log('🔵 Agendando notificação no dispositivo...');
      await LocalNotifications.schedule({
        notifications: [notification],
      });

      console.log('✅ Notificação agendada com sucesso para:', notificationTime.toLocaleString());
      return notificationId;
    } catch (error) {
      console.error('❌ Erro detalhado ao agendar notificação:', {
        error: error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : null,
        platform: Capacitor.getPlatform(),
        reminder: {
          movieTitle: reminder.movieTitle,
          reminderDate: reminder.reminderDate,
          reminderTime: reminder.reminderTime
        }
      });
      
      // Relançar o erro com mais informações
      if (error instanceof Error) {
        // Verificar se é erro específico do Android sobre ID de notificação
        if (error.message.includes('identifier should be a Java int')) {
          throw new Error('Erro interno do sistema Android. Tente novamente ou reinicie o aplicativo.');
        }
        throw error;
      } else {
        throw new Error(`Erro inesperado ao agendar notificação: ${JSON.stringify(error)}`);
      }
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
        id: Math.floor(Math.random() * 2147483647), // ID compatível com Android
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
