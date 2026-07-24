import { NotificationType } from '../../common/enums';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  grievanceId?: string;
}