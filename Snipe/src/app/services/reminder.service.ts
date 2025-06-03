import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MovieReminder, CreateReminderRequest } from '../models/reminder.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class ReminderService {
  private readonly STORAGE_KEY = 'movie_reminders';
  private remindersSubject = new BehaviorSubject<MovieReminder[]>([]);

  constructor(private notificationService: NotificationService) {
    this.loadReminders();
  }

  /**
   * Observable para os lembretes
   */
  get reminders$(): Observable<MovieReminder[]> {
    return this.remindersSubject.asObservable();
  }

  /**
   * Carrega lembretes do localStorage
   */
  private async loadReminders(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const reminders: MovieReminder[] = JSON.parse(stored).map((r: any) => ({
          ...r,
          reminderDate: new Date(r.reminderDate),
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        }));

        // Filtrar lembretes expirados
        const activeReminders = reminders.filter((r) => {
          const reminderDateTime = new Date(r.reminderDate);
          const [hours, minutes] = r.reminderTime.split(':').map(Number);
          reminderDateTime.setHours(hours, minutes, 0, 0);
          return reminderDateTime.getTime() > Date.now();
        });

        this.remindersSubject.next(activeReminders);

        // Se houve mudanças, salvar
        if (activeReminders.length !== reminders.length) {
          this.saveReminders(activeReminders);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar lembretes:', error);
      this.remindersSubject.next([]);
    }
  }

  /**
   * Salva lembretes no localStorage
   */
  private saveReminders(reminders: MovieReminder[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error('Erro ao salvar lembretes:', error);
    }
  }

  /**
   * Cria um novo lembrete
   */
  async createReminder(request: CreateReminderRequest): Promise<MovieReminder> {
    try {
      const now = new Date();
      const reminder: MovieReminder = {
        id: this.generateId(),
        movieTitle: request.movieTitle,
        moviePoster: request.moviePoster,
        reminderDate: request.reminderDate,
        reminderTime: request.reminderTime,
        message: request.message || 'Hora do Filme! 🍿',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      // Agendar notificação
      const notificationId =
        await this.notificationService.scheduleMovieReminder(reminder);
      reminder.notificationId = notificationId;

      // Adicionar à lista
      const currentReminders = this.remindersSubject.value;
      const updatedReminders = [...currentReminders, reminder];

      this.saveReminders(updatedReminders);
      this.remindersSubject.next(updatedReminders);

      console.log('Lembrete criado:', reminder);
      return reminder;
    } catch (error) {
      console.error('Erro ao criar lembrete:', error);
      throw error;
    }
  }

  /**
   * Remove um lembrete
   */
  async removeReminder(reminderId: string): Promise<void> {
    try {
      const currentReminders = this.remindersSubject.value;
      const reminder = currentReminders.find((r) => r.id === reminderId);

      if (reminder && reminder.notificationId) {
        // Cancelar notificação
        await this.notificationService.cancelNotification(
          reminder.notificationId
        );
      }

      // Remover da lista
      const updatedReminders = currentReminders.filter(
        (r) => r.id !== reminderId
      );

      this.saveReminders(updatedReminders);
      this.remindersSubject.next(updatedReminders);

      console.log('Lembrete removido:', reminderId);
    } catch (error) {
      console.error('Erro ao remover lembrete:', error);
      throw error;
    }
  }

  /**
   * Atualiza um lembrete existente
   */
  async updateReminder(
    reminderId: string,
    updates: Partial<MovieReminder>
  ): Promise<MovieReminder> {
    try {
      const currentReminders = this.remindersSubject.value;
      const reminderIndex = currentReminders.findIndex(
        (r) => r.id === reminderId
      );

      if (reminderIndex === -1) {
        throw new Error('Lembrete não encontrado');
      }

      const currentReminder = currentReminders[reminderIndex];

      // Se a data/hora mudou, cancelar notificação antiga e criar nova
      if (updates.reminderDate || updates.reminderTime) {
        if (currentReminder.notificationId) {
          await this.notificationService.cancelNotification(
            currentReminder.notificationId
          );
        }

        const updatedReminder = {
          ...currentReminder,
          ...updates,
          updatedAt: new Date(),
        };
        const notificationId =
          await this.notificationService.scheduleMovieReminder(updatedReminder);
        updatedReminder.notificationId = notificationId;

        currentReminders[reminderIndex] = updatedReminder;
      } else {
        currentReminders[reminderIndex] = {
          ...currentReminder,
          ...updates,
          updatedAt: new Date(),
        };
      }

      this.saveReminders(currentReminders);
      this.remindersSubject.next([...currentReminders]);

      return currentReminders[reminderIndex];
    } catch (error) {
      console.error('Erro ao atualizar lembrete:', error);
      throw error;
    }
  }
  /**
   * Obtém lembretes de um filme específico
   */
  getRemindersForMovie(movieTitle: string): MovieReminder[] {
    return this.remindersSubject.value.filter(
      (r) => r.movieTitle === movieTitle
    );
  }

  /**
   * Obtém lembretes próximos (nas próximas 24 horas)
   */
  getUpcomingReminders(): MovieReminder[] {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return this.remindersSubject.value.filter((reminder) => {
      const reminderDateTime = new Date(reminder.reminderDate);
      const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
      reminderDateTime.setHours(hours, minutes, 0, 0);

      return (
        reminderDateTime.getTime() >= now.getTime() &&
        reminderDateTime.getTime() <= next24Hours.getTime()
      );
    });
  }
  /**
   * Verifica se um filme já tem lembretes
   */
  hasRemindersForMovie(movieTitle: string): boolean {
    return this.remindersSubject.value.some((r) => r.movieTitle === movieTitle);
  }

  /**
   * Remove todos os lembretes
   */
  async clearAllReminders(): Promise<void> {
    try {
      // Cancelar todas as notificações
      const currentReminders = this.remindersSubject.value;
      for (const reminder of currentReminders) {
        if (reminder.notificationId) {
          await this.notificationService.cancelNotification(
            reminder.notificationId
          );
        }
      }

      // Limpar storage e subject
      localStorage.removeItem(this.STORAGE_KEY);
      this.remindersSubject.next([]);

      console.log('Todos os lembretes foram removidos');
    } catch (error) {
      console.error('Erro ao limpar lembretes:', error);
      throw error;
    }
  }

  /**
   * Gera um ID único para o lembrete
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Formata data para exibição
   */
  formatReminderDate(reminder: MovieReminder): string {
    const reminderDateTime = new Date(reminder.reminderDate);
    const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
    reminderDateTime.setHours(hours, minutes, 0, 0);

    return reminderDateTime.toLocaleString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Calcula tempo restante até o lembrete
   */
  getTimeUntilReminder(reminder: MovieReminder): string {
    const now = new Date();
    const reminderDateTime = new Date(reminder.reminderDate);
    const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
    reminderDateTime.setHours(hours, minutes, 0, 0);

    const diff = reminderDateTime.getTime() - now.getTime();

    if (diff <= 0) return 'Expirado';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `Em ${days} dia${days > 1 ? 's' : ''}`;
    if (hoursLeft > 0) return `Em ${hoursLeft}h ${minutesLeft}m`;
    return `Em ${minutesLeft} minuto${minutesLeft > 1 ? 's' : ''}`;
  }
}
