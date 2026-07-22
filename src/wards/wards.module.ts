import { Module } from '@nestjs/common';
import { WardsService } from './wards.service';
import { WardsController } from './wards.controller';
import { Ward } from './entities/ward.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ward, User])],
  controllers: [WardsController],
  providers: [WardsService],
  exports: [WardsService, TypeOrmModule],
})
export class WardsModule {}
