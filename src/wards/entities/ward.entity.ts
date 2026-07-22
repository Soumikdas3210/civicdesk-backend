import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('wards')
export class Ward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    unique: true,
  })
  code: string;
}
