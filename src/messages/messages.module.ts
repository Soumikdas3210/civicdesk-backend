import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { Message } from './entities/message.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrievancesModule } from 'src/grievances/grievances.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), GrievancesModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
