import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Grievance } from '../../grievances/entities/grievance.entity';
import { Message } from '../../messages/entities/message.entity';
import { User } from '../../users/entities/user.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Grievance, { nullable: false })
  @JoinColumn({ name: 'grievanceId' })
  grievance: Grievance;
  @Column({ type: 'uuid' })
  grievanceId: string;

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'messageId' })
  message?: Message;
  @Column({ type: 'uuid', nullable: true })
  messageId?: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;
  @Column({ type: 'uuid' })
  uploadedById: string;

  @Column()
  fileName: string;

  @Column()
  storagePath: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  sizeBytes: string; // pg returns bigint as string, same pattern as pausedMs

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}