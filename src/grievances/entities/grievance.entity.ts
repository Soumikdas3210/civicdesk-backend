import { GrievanceStatus, Priority } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';
import { Category } from 'src/categories/entities/category.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ward } from 'src/wards/entities/ward.entity';
import { AuditLog } from './audit-log.entity';

@Entity('grievances')
export class Grievance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
  })
  trackingCode: string; // INV-12

  @Column()
  title: string;

  @Column({
    type: 'text',
  })
  description: string;

  @Column({
    type: 'enum',
    enum: GrievanceStatus,
    enumName: 'grievance_status_enum',
    default: GrievanceStatus.OPEN,
  })
  status: GrievanceStatus;

  @Column({
    type: 'enum',
    enum: Priority,
    enumName: 'priority_enum',
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'citizenId',
  })
  citizen: User;

  @Column({
    type: 'uuid',
  })
  citizenId: string;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({
    name: 'assignedOfficerId',
  })
  assignedOfficer?: User;
  @Column({
    type: 'uuid',
    nullable: true,
  })
  assignedOfficerId?: string;

  @ManyToOne(() => Category, {
    nullable: false,
  })
  @JoinColumn({
    name: 'categoryId',
  })
  category: Category;
  @Column({
    type: 'uuid',
  })
  categoryId: string;

  @ManyToOne(() => Ward, {
    nullable: false,
  })
  @JoinColumn({
    name: 'wardId',
  })
  ward: Ward;
  @Column({
    type: 'uuid',
  })
  wardId: string;

  //INV-4: Set at creattion, never nill
  @Column({
    type: 'timestamptz',
  })
  responseDueAt: Date;
  @Column({
    type: 'timestamptz',
  })
  resolutionDueAt: Date;

  // INV-5: satisfaction points. resolvedAt is cleared by a REOPEN.
  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  firstRespondedAt?: Date | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  resolvedAt?: Date | null;

  // INV-4: pause accounting. Written by the state machine (4.3), read by the
  // Phase 2 scanner. bigint because int overflows at 24.8 days.
  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  waitingSince?: Date | null;

  @Column({
    type: 'bigint',
    default: 0,
  })
  pausedMs: string; // pg returns bigint as string

  // INV-5: written ONLY by the Phase 2 scanner, cleared only by a REOPEN.
  @Column({
    default: false,
  })
  responseBreached: boolean;

  @Column({
    default: false,
  })
  resolutionBreached: boolean;

  // Written by the Phase 2 AI module. Advisory only, never core data.
  @Column({
    type: 'uuid',
    nullable: true,
  })
  suggestedCategoryId?: string;

  @Column({
    type: 'enum',
    enum: Priority,
    enumName: 'priority_enum',
    nullable: true,
  })
  suggestedPriority?: Priority;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
  })
  updatedAt: Date;

  // TODO(4.6): @OneToMany(() => Message, (message) => message.grievance) messages: Message[];
  @OneToMany(() => AuditLog, (auditLog) => auditLog.grievance)
  auditLogs: AuditLog[];

  // Phase 2 relations. Declared now so this file is not reopened.
  // @ManyToMany(() => Tag) @JoinTable({ name: 'grievance_tags', ... }) tags: Tag[];
  // @OneToOne(() => Rating, (rating) => rating.grievance) rating?: Rating;
  // @OneToMany(() => Attachment, (attachment) => attachment.grievance) attachments: Attachment[];
}
