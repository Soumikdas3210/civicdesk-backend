import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    nullable: true,
  })
  description?: string;

  @Column({
    default: true,
  })
  isActive: boolean;

  @ManyToOne(() => Department, (department) => department.categories, {
    nullable: false,
  })
  @JoinColumn({
    name: 'departmentId',
  })
  department: Department;

  @Column({
    type: 'uuid',
  })
  departmentId: string;
}
