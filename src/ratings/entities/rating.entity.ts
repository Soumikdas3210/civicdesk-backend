import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Grievance } from '../../grievances/entities/grievance.entity';

@Entity('ratings')
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Grievance)
  @JoinColumn({ name: 'grievanceId' })
  grievance: Grievance;

  @Column({ type: 'uuid', unique: true })
  grievanceId: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}