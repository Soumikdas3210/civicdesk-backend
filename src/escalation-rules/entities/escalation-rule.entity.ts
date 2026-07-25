import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Department } from 'src/departments/entities/department.entity';
import { EscalationTrigger, EscalationAction, Priority } from 'src/common/enums';

@Entity('escalation_rules')
export class EscalationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: EscalationTrigger, enumName: 'escalation_trigger_enum' })
  trigger: EscalationTrigger;

  @Column({ type: 'int', nullable: true })
  thresholdHours?: number;

  @Column({ type: 'enum', enum: Priority, enumName: 'priority_enum', nullable: true })
  priorityFilter?: Priority;

  @Column({ type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department?: Department;

  @Column({ type: 'enum', enum: EscalationAction, enumName: 'escalation_action_enum' })
  action: EscalationAction;

  @Column({ type: 'enum', enum: Priority, enumName: 'priority_enum', nullable: true })
  targetPriority?: Priority;
}