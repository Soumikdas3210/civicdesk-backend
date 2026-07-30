import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationType } from '../common/enums';

const TEMPLATE_MAP: Partial<Record<NotificationType, { template: string; subjectPrefix: string }>> = {
  [NotificationType.GRIEVANCE_SUBMITTED]: { template: 'grievance-received', subjectPrefix: 'Grievance Received' },
  [NotificationType.GRIEVANCE_ASSIGNED]: { template: 'grievance-assigned', subjectPrefix: 'New Grievance Assigned' },
  [NotificationType.GRIEVANCE_RESOLVED]: { template: 'grievance-resolved', subjectPrefix: 'Grievance Resolved' },
  [NotificationType.SLA_BREACH]: { template: 'sla-breach', subjectPrefix: 'SLA Breach' },
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(private mailer: MailerService) {}

  async send(input: { userId: string; type: NotificationType; body: string; grievanceId?: string; toEmail?: string; trackingCode?: string }): Promise<void> {
    try {
      const cfg = TEMPLATE_MAP[input.type];
      if (!cfg || !input.toEmail) return; // not every notification type has an email
      await this.mailer.sendMail({
        to: input.toEmail,
        subject: `${cfg.subjectPrefix} - ${input.trackingCode ?? ''}`,
        template: cfg.template,
        context: { trackingCode: input.trackingCode },
      });
    } catch (err) {
      this.logger.error('Mail send failed', err.stack);
    }
  }
}