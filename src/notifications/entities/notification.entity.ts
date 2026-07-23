import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationType } from '../../common/enums';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => User) @JoinColumn({ name: 'userId' }) user: User;
  @Column({ type: 'uuid' }) userId: string;

  @Column({ type: 'enum', enum: NotificationType, enumName: 'notification_type_enum' })
  type: NotificationType;
  @Column() title: string;
  @Column({ type: 'text' }) body: string;
  @Column({ default: false }) isRead: boolean;

  @Column({ type: 'uuid', nullable: true }) grievanceId?: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}