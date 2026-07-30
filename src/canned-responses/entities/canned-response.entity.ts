import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Department } from 'src/departments/entities/department.entity';
import { Category } from 'src/categories/entities/category.entity';
import { User } from 'src/users/entities/user.entity';

@Entity('canned_responses')
export class CannedResponse {
  @PrimaryGeneratedColumn('uuid') 
  id: string;

  @Column() title: string;
  @Column({ type: 'text' }) 
  body: string;

  @Column({ type: 'uuid', nullable: true }) 
  departmentId?: string | null;
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department?: Department | null;

  @Column({ type: 'uuid', nullable: true }) 
  categoryId?: string | null;
  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category?: Category | null;

  @Column({ type: 'uuid' }) 
  createdById: string;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn({ type: 'timestamptz' }) 
  createdAt: Date;
}