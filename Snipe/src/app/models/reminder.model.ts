/**
 * Interface para lembretes de filmes
 */
export interface MovieReminder {
  id: string;
  movieTitle: string;
  moviePoster?: string;
  reminderDate: Date;
  reminderTime: string;
  message: string;
  isActive: boolean;
  notificationId?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para criar um novo lembrete
 */
export interface CreateReminderRequest {
  movieTitle: string;
  moviePoster?: string;
  reminderDate: Date;
  reminderTime: string;
  message?: string;
}

/**
 * Interface para configurações de notificação
 */
export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  reminderMinutesBefore: number;
}
