import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { MailService } from '../mail/mail.service';
import { NotificationType } from '../common/enums';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  grievanceId?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
    private mailService: MailService,
  ) {}

  async notify(input: CreateNotificationInput): Promise<void> {
    try {
      await this.repo.save(this.repo.create(input));
      await this.mailService.send(input);
    } catch (err) {
      this.logger.error(`Notification failed for user ${input.userId}`, err.stack);
    }
  }
}