import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Grievance } from 'src/grievances/entities/grievance.entity';
import { User } from 'src/users/entities/user.entity';

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

  // Phase 2 relation. Declared now so this file is not reopened.
  // @OneToMany(() => Attachment, (attachment) => attachment.message) attachments?: Attachment[];
}
