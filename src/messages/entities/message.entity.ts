import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Grievance } from 'src/grievances/entities/grievance.entity';
import { User } from 'src/users/entities/user.entity';
import { Attachment } from 'src/attachments/entities/attachment.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Grievance, (grievance) => grievance.messages)
  @JoinColumn({ name: 'grievanceId' })
  grievance: Grievance;
  @Column({ type: 'uuid' })
  grievanceId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;
  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: false })
  isInternal: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Attachment, (attachment) => attachment.message)
  attachments?: Attachment[];
}
