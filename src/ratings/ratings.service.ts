import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { Grievance } from '../grievances/entities/grievance.entity';
import { CreateRatingDto } from './dto/create-rating.dto';
import { GrievanceStatus, Role } from 'src/common/enums';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepo: Repository<Rating>,
    @InjectRepository(Grievance)
    private readonly grievanceRepo: Repository<Grievance>,
  ) {}

  async rate(
    grievanceId: string,
    dto: CreateRatingDto,
    citizen: { id: string; role: Role },
  ): Promise<Rating> {
    const grievance = await this.grievanceRepo.findOne({
      where: { id: grievanceId },
    });
    if (!grievance) {
      throw new NotFoundException(`Grievance ${grievanceId} not found`);
    }
    if (grievance.citizenId !== citizen.id) {
      throw new ForbiddenException('You can only rate your own grievance');
    }
    if (
      grievance.status !== GrievanceStatus.RESOLVED &&
      grievance.status !== GrievanceStatus.CLOSED
    ) {
      throw new ConflictException(
        'Grievance must be resolved or closed before it can be rated',
      );
    }

    const existing = await this.ratingRepo.findOne({
      where: { grievanceId },
    });
    if (existing) {
      throw new ConflictException('This grievance has already been rated');
    }

    try {
      const rating = this.ratingRepo.create({
        grievanceId,
        score: dto.score,
        comment: dto.comment,
      });
      return await this.ratingRepo.save(rating);
    } catch (err: any) {
      // Postgres unique_violation — catches the race where two requests
      // both pass the findOne check above at nearly the same time.
      if (err.code === '23505') {
        throw new ConflictException('This grievance has already been rated');
      }
      throw err;
    }
  }

  async findForGrievance(
    grievanceId: string,
    actor: { id: string; role: Role },
  ): Promise<Rating | null> {
    const grievance = await this.grievanceRepo.findOne({
      where: { id: grievanceId },
    });
    if (!grievance) throw new NotFoundException('Grievance not found');

    if (actor.role === Role.CITIZEN && grievance.citizenId !== actor.id) {
      throw new NotFoundException('Grievance not found'); // INV-9: 404, not 403
    }
    if (
      actor.role === Role.OFFICER &&
      grievance.assignedOfficerId !== actor.id
    ) {
      throw new ForbiddenException('Officer is not assigned to this grievance');
    }

    return this.ratingRepo.findOne({ where: { grievanceId } });
  }

  /** Called by GrievancesService on REOPEN. Deletes silently if no rating exists. */
  async retractForGrievance(grievanceId: string): Promise<Rating | null> {
    const rating = await this.ratingRepo.findOne({ where: { grievanceId } });
    if (!rating) return null;
    await this.ratingRepo.remove(rating);
    return rating;
  }
}