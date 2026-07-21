import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../../common/enums';

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

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;
}
