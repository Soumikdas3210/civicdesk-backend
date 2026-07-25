import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { GrievancesService } from 'src/grievances/grievances.service';
import { Role, ActorKind, GrievanceAction, NotificationType } from 'src/common/enums';
import { tryTransition } from 'src/common/state-machine/transition-map';
import { NotificationsService } from 'src/notifications/notifications.service';
//import { UsersService } from 'src/users/users.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly grievancesService: GrievancesService,
    private readonly notificationService: NotificationsService,
    //private readonly usersService: UsersService,
  ) {}

  async postMessage(
    grievanceId: string,
    dto: CreateMessageDto,
    actor: { id: string; role: Role },
  ) {
    const grievance = await this.grievancesService.findRawById(grievanceId);
    if (!grievance) throw new NotFoundException('Grievance not found');

    const isOwner =
      actor.role === Role.CITIZEN && grievance.citizenId === actor.id;
    const isAssignee =
      actor.role === Role.OFFICER && grievance.assignedOfficerId === actor.id;
    const isAdmin = actor.role === Role.ADMIN;
    if (!isOwner && !isAssignee && !isAdmin) {
      throw new ForbiddenException('You may not post to this grievance');
    }

    const isInternal = dto.isInternal ?? false;
    if (isInternal && actor.role === Role.CITIZEN) {
      throw new ForbiddenException('Citizens cannot post internal notes'); // INV-8
    }

    const message = this.messageRepo.create({
      grievanceId,
      authorId: actor.id,
      body: dto.body,
      isInternal,
    });
    await this.messageRepo.save(message);

    if (!isInternal) {
      if (actor.role === Role.CITIZEN) {
        if (grievance.assignedOfficerId) {
          await this.notificationService.notify({
            userId: grievance.assignedOfficerId,
            type: NotificationType.NEW_REPLY,
            title: 'New reply',
            body: `New reply on ${grievance.trackingCode}.`,
            grievanceId: grievance.id,
          });
        }
        // TODO:
        // When UsersService.getAdminIds() is available,
        // notify admins if the grievance is unassigned.
      } else {
        await this.notificationService.notify({
          userId: grievance.citizenId,
          type: NotificationType.NEW_REPLY,
          title: 'New reply',
          body: `New reply on ${grievance.trackingCode}.`,
          grievanceId: grievance.id,
        });
      }
    }

    // INV-5: only the FIRST public message from the assignee or an admin
    if (
      !isInternal &&
      actor.role !== Role.CITIZEN &&
      !grievance.firstRespondedAt
    ) {
      grievance.firstRespondedAt = new Date();
      await this.grievancesService.saveRaw(grievance);
    }

    // INV-6: ask the map, never branch on status here
    if (actor.role === Role.CITIZEN) {
      const next = tryTransition(
        grievance.status,
        ActorKind.CITIZEN,
        GrievanceAction.CITIZEN_REPLY,
      );
      if (next) {
        await this.grievancesService.applyTransition(grievance, next, actor.id);
      }
    }

    return message;
  }

  async findThread(grievanceId: string, actor: { id: string; role: Role }) {
    const grievance = await this.grievancesService.findRawById(grievanceId);
    if (!grievance) throw new NotFoundException('Grievance not found');

    const isOwner =
      actor.role === Role.CITIZEN && grievance.citizenId === actor.id;
    if (actor.role === Role.CITIZEN && !isOwner) {
      throw new NotFoundException('Grievance not found'); // INV-9: 404, not 403
    }
    if (actor.role === Role.OFFICER) {
      const eligible = await this.grievancesService.isEligibleById(
        grievanceId,
        actor.id,
      );
      if (!eligible)
        throw new ForbiddenException(
          'Officer is not eligible for this grievance',
        );
    }

    const where: { grievanceId: string; isInternal?: boolean } = {
      grievanceId,
    };
    if (actor.role === Role.CITIZEN) {
      where.isInternal = false; // INV-8: filtered IN the query, not mapped after
    }

    return this.messageRepo.find({ where, order: { createdAt: 'ASC' } });
  }
}
