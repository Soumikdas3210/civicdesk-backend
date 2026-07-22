import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../../common/enums';
import { Department } from 'src/departments/entities/department.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
  })
  email: string;

  @Column()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'role_enum',
  })
  role: Role;

  @Column()
  fullName: string;

  @Column({
    nullable: true,
  })
  phone?: string;

  @Column({
    default: true,
  })
  isActive: boolean;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  departmentId?: string | null;

  @ManyToOne(() => Department, (department) => department.officers, {
    nullable: true,
  })
  @JoinColumn({ name: 'departmentId' })
  department?: Department;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;
}
