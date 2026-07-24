import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Grievance } from './entities/grievance.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateGrievanceDto } from './dto/create-grievance.dto';
import { Category } from 'src/categories/entities/category.entity';
import { Ward } from 'src/wards/entities/ward.entity';
import { AuditService } from './audit.service';
import { SlaService } from 'src/sla/sla.service';
import { AI_SERVICE } from 'src/ai/ai.interface';
import {
  AuditAction,
  Priority,
  Role,
  ActorKind,
  GrievanceStatus,
} from 'src/common/enums';
import type { AiService } from 'src/ai/ai.interface';
import { ChangeStatusDto } from './dto/change-status.dto';
import { resolveTransition } from 'src/common/state-machine/transition-map';

@Injectable()
export class GrievancesService {
  constructor(
    @InjectRepository(Grievance)
    private readonly grievanceRepo: Repository<Grievance>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Ward) private readonly wardRepo: Repository<Ward>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly slaService: SlaService,
    @Inject(AI_SERVICE) private readonly aiService: AiService,
  ) {}

  async onModuleInit() {
    await this.dataSource.query(
      `CREATE SEQUENCE IF NOT EXISTS grievance_tracking_seq`,
    );
  }

  private async generateTrackingCode(): Promise<string> {
    const [{ nextval }] = await this.dataSource.query<{ nextval: string }[]>(
      `SELECT nextval('grievance_tracking_seq')`,
    );

    const year = new Date().getFullYear();
    return `GRV-${year}-${String(nextval).padStart(6, '0')}`;
  }

  async create(dto: CreateGrievanceDto, citizenId: string): Promise<Grievance> {
    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category ${dto.categoryId} not found`);
    }

    const ward = await this.wardRepo.findOne({ where: { id: dto.wardId } });
    if (!ward) {
      throw new NotFoundException(`Ward ${dto.wardId} not found`);
    }

    const priority = dto.priority ?? Priority.MEDIUM;
    const trackingCode = await this.generateTrackingCode();
    const { responseDueAt, resolutionDueAt } =
      await this.slaService.computeDeadlines(category.id, priority);

    const grievance = this.grievanceRepo.create({
      trackingCode,
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      wardId: dto.wardId,
      citizenId: citizenId,
      priority,
      responseDueAt,
      resolutionDueAt,
    });

    // AI seam: NoopAiService returns null in Phase 1, this proves the
    // disabled path continuously rather than claiming it once at the end.

    const suggestion = await this.aiService.suggestTriage({
      title: dto.title,
      description: dto.description,
      categories: [
        {
          id: dto.categoryId,
          name: category.name,
        },
      ],
    });
    grievance.suggestedCategoryId = suggestion?.categoryId ?? undefined;
    grievance.suggestedPriority = suggestion?.priority ?? undefined;

    const saved = await this.grievanceRepo.save(grievance);

    await this.auditService.record({
      grievanceId: saved.id,
      actorId: citizenId,
      action: AuditAction.CREATED,
    });

    return this.grievanceRepo.findOneOrFail({
      where: { id: saved.id },
      relations: {
        category: {
          department: true,
        },
        ward: true,
      },
    });
  }

  async changeStatus(
    grievanceId: string,
    dto: ChangeStatusDto,
    actor: {
      id: string;
      role: Role;
    },
  ): Promise<Grievance> {
    const grievance = await this.grievanceRepo.findOne({
      where: { id: grievanceId },
    });
    if (!grievance) {
      throw new NotFoundException(`Grievance ${grievanceId} not found`);
    }

    // Actor precondition, BEFORE the map. INV-9 + the assignee rule.
    if (actor.role === Role.CITIZEN && grievance.citizenId !== actor.id) {
      throw new ForbiddenException(
        `Citizen ${actor.id} is not the owner of grievance ${grievanceId}`,
      );
    }
    if (
      actor.role === Role.OFFICER &&
      grievance.assignedOfficerId !== actor.id
    ) {
      throw new ForbiddenException(
        `Officer ${actor.id} is not assigned to grievance ${grievanceId}`,
      );
    }

    const actorKind = actor.role as unknown as ActorKind; // Role and ActorKind share member names
    const next = resolveTransition(grievance.status, actorKind, dto.action);

    // INV-4: pause accounting
    if (next === GrievanceStatus.WAITING_ON_CITIZEN) {
      grievance.waitingSince = new Date();
    }
    if (grievance.waitingSince && next !== GrievanceStatus.WAITING_ON_CITIZEN) {
      grievance.pausedMs = String(
        BigInt(grievance.pausedMs) +
          BigInt(Date.now() - grievance.waitingSince.getTime()),
      );
      grievance.waitingSince = null;
    }

    // INV-5: resolution satisfied
    if (next === GrievanceStatus.RESOLVED) {
      grievance.resolvedAt = new Date();
    }

    // INV-5 + INV-9: a REOPEN starts a NEW resolution cycle
    if (next === GrievanceStatus.REOPENED) {
      grievance.resolvedAt = null;
      grievance.resolutionBreached = false;
      const d = await this.slaService.computeDeadlines(
        grievance.categoryId,
        grievance.priority,
        new Date(),
      );
      grievance.resolutionDueAt = d.resolutionDueAt;
      // firstRespondedAt, responseDueAt, responseBreached are NOT touched.

      await this.retractRating(grievance, actor.id);
    }

    const fromStatus = grievance.status;
    grievance.status = next;
    await this.grievanceRepo.save(grievance);

    await this.auditService.record({
      grievanceId: grievance.id,
      actorId: actor.id,
      action: AuditAction.STATUS_CHANGED,
      fromStatus,
      toStatus: next,
    });

    return this.grievanceRepo.findOneOrFail({
      where: { id: grievance.id },
      relations: {
        category: {
          department: true,
        },
        ward: true,
      },
    });
  }

  // Ratings don't exist until Phase 2 (P3.3). Stub now, filled in then.
  private retractRating(
    _grievance: Grievance,
    _actorId: string,
  ): Promise<void> {
    void _grievance;
    void _actorId;
    return Promise.resolve();
  }
}
