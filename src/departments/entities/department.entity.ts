import { Category } from 'src/categories/entities/category.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
  })
  name: string;

  @Column({
    nullable: true,
  })
  description?: string;

  @OneToMany(() => Category, (category) => category.department)
  categories: Category[];

  @OneToMany(() => User, (user) => user.department)
  officers?: User[];
}
