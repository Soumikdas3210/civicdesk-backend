import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from './entities/notification.entity';
import { CreateNotificationInput } from './interfaces/create-notification-input.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async notify(input: CreateNotificationInput): Promise<void> {
    try {
      const notification = this.notificationRepository.create({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        grievanceId: input.grievanceId,
      });

      await this.notificationRepository.save(notification);
    } catch (err) {
      this.logger.error(
        `Notification failed for user ${input.userId}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}