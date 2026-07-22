import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from 'src/categories/entities/category.entity';
import { Priority } from 'src/common/enums';

@Entity('sla_policies')
@Unique(['categoryId', 'priority'])
export class SLAPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
  })
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({
    type: 'enum',
    enum: Priority,
    enumName: 'priority_enum',
  })
  priority: Priority;

  @Column({
    type: 'int',
  })
  responseDueHours: number;

  @Column({
    type: 'int',
  })
  resolutionDueHours: number;
}
