import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Grievance } from './entities/grievance.entity';
import {
  DataSource,
  Repository,
  In,
  IsNull,
  Not,
  SelectQueryBuilder,
} from 'typeorm';
import { CreateGrievanceDto } from './dto/create-grievance.dto';
import { Category } from 'src/categories/entities/category.entity';
import { Ward } from 'src/wards/entities/ward.entity';
import { AuditService } from './audit.service';
import { SlaService } from 'src/sla/sla.service';
import { AI_SERVICE } from 'src/ai/ai.interface';
import {
  AuditAction,
  Priority,
  PRIORITY_RANK,
  Role,
  ActorKind,
  GrievanceStatus,
} from 'src/common/enums';
import type { AiService } from 'src/ai/ai.interface';
import { ChangeStatusDto } from './dto/change-status.dto';
import { resolveTransition } from 'src/common/state-machine/transition-map';
import { User } from 'src/users/entities/user.entity';
import { AssignGrievanceDto } from './dto/assign-grievance.dto';
import { QueryGrievancesDto } from './dto/query-grievance.dto';
import { NotificationType } from 'src/common/enums';
import { NotificationsService } from 'src/notifications/notifications.service';
import { AuditLog } from './entities/audit-log.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { RatingsService } from 'src/ratings/ratings.service';
import { RecategorizeGrievanceDto } from './dto/recategorize-grievance.dto';
import { EscalateGrievanceDto } from './dto/escalate-grievance.dto';
import { Message } from 'src/messages/entities/message.entity';

@Injectable()
export class GrievancesService {
  constructor(
    @InjectRepository(Grievance)
    private readonly grievanceRepo: Repository<Grievance>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Ward) private readonly wardRepo: Repository<Ward>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(Tag) private readonly tagRepo: Repository<Tag>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly slaService: SlaService,
    @Inject(AI_SERVICE) private readonly aiService: AiService,
    private readonly notificationService: NotificationsService,
    private readonly ratingsService: RatingsService,
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

    const citizen = await this.userRepo.findOne({
      where: { id: grievance.citizenId },
    });

    void this.notificationService.notify({
      userId: grievance.citizenId,
      type: NotificationType.GRIEVANCE_SUBMITTED,
      title: 'Grievance received',
      body: `Your grievance ${grievance.trackingCode} has been received.`,
      grievanceId: grievance.id,
      toEmail: citizen?.email,
      trackingCode: grievance.trackingCode,
    });

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

    await this.applyTransition(grievance, next, actor.id);

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

  private async retractRating(
    grievance: Grievance,
    actorId: string,
  ): Promise<void> {
    const removed = await this.ratingsService.retractForGrievance(grievance.id);
    if (!removed) return;

    await this.auditService.record({
      grievanceId: grievance.id,
      actorId,
      action: AuditAction.RATING_RETRACTED,
      metadata: { score: removed.score, comment: removed.comment },
    });
  }

  isEligible(grievance: Grievance, officer: User): boolean {
    return (
      officer.role === Role.OFFICER &&
      officer.isActive &&
      officer.departmentId === grievance.category.departmentId &&
      (officer.wards ?? []).some((ward) => ward.id === grievance.wardId)
    );
  }

  private assertEligibility(grievance: Grievance, officer: User) {
    if (!this.isEligible(grievance, officer)) {
      throw new ForbiddenException(
        'Officer is not eligible to act on this grievance',
      );
    }
  }

  async retag(
    grievanceId: string,
    tagIds: string[],
    actor: { id: string; role: Role },
  ): Promise<Grievance> {
    const grievance = await this.grievanceRepo.findOne({
      where: { id: grievanceId },
      relations: { tags: true },
    });
    if (!grievance) {
      throw new NotFoundException(`Grievance ${grievanceId} not found`);
    }

    if (actor.role === Role.OFFICER && grievance.assignedOfficerId !== actor.id) {
      throw new ForbiddenException(
        'Only the assigned officer or an admin can retag this grievance',
      );
    }

    if (tagIds.length === 0) {
      grievance.tags = [];
    } else {
      const tags = await this.tagRepo.findBy({ id: In(tagIds) });
      if (tags.length !== tagIds.length) {
        throw new NotFoundException('One or more tags not found');
      }
      grievance.tags = tags;
    }

    return this.grievanceRepo.save(grievance);
  }

  async assign(
    grievanceId: string,
    dto: AssignGrievanceDto,
    actor: {
      id: string;
      role: Role;
    },
  ): Promise<Grievance> {
    const grievance = await this.grievanceRepo.findOne({
      where: { id: grievanceId },
      relations: { category: true },
    });
    if (!grievance) {
      throw new NotFoundException(`Grievance ${grievanceId} not found`);
    }

    const targetOfficerId =
      actor.role === Role.ADMIN ? dto.officerId : actor.id;
    if (!targetOfficerId) {
      throw new BadRequestException(
        'OfficerId is required when an admin assigns a grievance',
      );
    }

    const officer = await this.dataSource.getRepository(User).findOne({
      where: { id: targetOfficerId },
      relations: { wards: true },
    });
    if (!officer) {
      throw new NotFoundException(`Officer ${targetOfficerId} not found`);
    }

    this.assertEligibility(grievance, officer);

    grievance.assignedOfficerId = officer.id;
    await this.grievanceRepo.save(grievance);

    void this.notificationService.notify({
      userId: grievance.assignedOfficerId,
      type: NotificationType.GRIEVANCE_ASSIGNED,
      title: 'New grievance assigned',
      body: `Grievance ${grievance.trackingCode} has been assigned to you.`,
      grievanceId: grievance.id,
      toEmail: officer?.email,
      trackingCode: grievance.trackingCode,
    });

    await this.auditService.record({
      grievanceId: grievance.id,
      actorId: actor.id,
      action: AuditAction.ASSIGNED,
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

  async reconcileAssignments(
    grievanceId: string[],
    cause: AuditAction,
  ): Promise<string[]> {
    if (grievanceId.length === 0) {
      return [];
    }

    const grievances = await this.grievanceRepo.find({
      where: { id: In(grievanceId), assignedOfficerId: Not(IsNull()) },
      relations: { category: true, assignedOfficer: { wards: true } },
    });

    const cleared: string[] = [];
    for (const grievance of grievances) {
      if (
        !grievance.assignedOfficer ||
        this.isEligible(grievance, grievance.assignedOfficer)
      ) {
        continue;
      }

      const previousOfficerId = grievance.assignedOfficerId;
      grievance.assignedOfficerId = null;
      grievance.assignedOfficer = null;
      await this.grievanceRepo.save(grievance);

      const previousOfficer = await this.userRepo.findOne({
        where: { id: previousOfficerId! },
      });
      if (previousOfficerId) {
  await this.notificationService.notify({
    userId: previousOfficerId,
    type: NotificationType.UNASSIGNED,
    title: 'Grievance unassigned',
    body: `Grievance ${grievance.trackingCode} was unassigned because you no longer meet eligibility.`,
    grievanceId: grievance.id,
    toEmail: previousOfficer?.email,
    trackingCode: grievance.trackingCode,
  });
}

await this.auditService.record({
  grievanceId: grievance.id,
  actorId: null,
  action: AuditAction.UNASSIGNED_INELIGIBLE,
  metadata: { previousOfficerId, cause },
});

cleared.push(grievance.id);
    }
    return cleared;
  }

  async grievanceIdsAssignedTo(officerId: string): Promise<string[]> {
    const rows = await this.grievanceRepo.find({
      where: { assignedOfficerId: officerId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async findAll(dto: QueryGrievancesDto, actor: { id: string; role: Role }) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const qb: SelectQueryBuilder<Grievance> = this.grievanceRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.category', 'category')
      .leftJoinAndSelect('category.department', 'department')
      .leftJoinAndSelect('g.ward', 'ward')
      .leftJoinAndSelect('g.tags', 'tags');

    switch (actor.role) {
      case Role.CITIZEN:
        qb.andWhere('g.citizenId = :uid', { uid: actor.id });
        break;

      case Role.OFFICER: {
        const officer = await this.userRepo.findOne({
          where: { id: actor.id },
          relations: { wards: true },
        });

        const wardIds = (officer?.wards ?? []).map((w) => w.id);
        if (wardIds.length === 0) {
          return { data: [], total: 0, page, limit };
        }
        qb.andWhere('category.departmentId = :dept', {
          dept: officer?.departmentId,
        }).andWhere('g.wardId IN (:...wardIds)', { wardIds });
        break;
      }
      case Role.ADMIN:
        break; // everything
    }

    if (dto.status) qb.andWhere('g.status = :status', { status: dto.status });
    if (dto.priority)
      qb.andWhere('g.priority = :priority', { priority: dto.priority });
    if (dto.categoryId)
      qb.andWhere('g.categoryId = :categoryId', { categoryId: dto.categoryId });
    if (dto.departmentId)
      qb.andWhere('category.departmentId = :departmentId', {
        departmentId: dto.departmentId,
      });
    if (dto.wardId) qb.andWhere('g.wardId = :wardId', { wardId: dto.wardId });
    if (dto.tagId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM grievance_tags gt WHERE gt."grievanceId" = g.id AND gt."tagId" = :tagId)`,
        { tagId: dto.tagId },
      );
    }
    if (dto.search) {
      qb.andWhere('(g.title ILIKE :search OR g.description ILIKE :search)', {
        search: `%${dto.search}%`,
      });
    }

    qb.orderBy('g.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOneScoped(
    grievanceId: string,
    actor: { id: string; role: Role },
  ): Promise<Grievance> {
    const g = await this.grievanceRepo.findOne({
      where: { id: grievanceId },
      relations: { category: { department: true }, ward: true },
    });
    if (!g) throw new NotFoundException('Grievance not found');

    if (actor.role === Role.CITIZEN) {
      if (g.citizenId !== actor.id) {
        throw new NotFoundException('Grievance not found'); // INV-9: 404, never 403
      }
      return g;
    }
    if (actor.role === Role.OFFICER) {
      const officer = await this.userRepo.findOne({
        where: { id: actor.id },
        relations: { wards: true },
      });
      if (!officer || !this.isEligible(g, officer)) {
        throw new ForbiddenException(
          'Officer is not eligible for this grievance',
        );
      }
      return g;
    }
    return g; // admin: everything
  }

  async applyTransition(
    grievance: Grievance,
    next: GrievanceStatus,
    actorId: string,
  ): Promise<void> {
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
      void this.notificationService.notify({
        userId: grievance.citizenId,
        type: NotificationType.GRIEVANCE_RESOLVED,
        title: 'Grievance resolved',
        body: `Grievance ${grievance.trackingCode} has been resolved. Please rate your experience.`,
        grievanceId: grievance.id,
      });
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
      await this.retractRating(grievance, actorId);
    }

    const fromStatus = grievance.status;
    grievance.status = next;
    await this.grievanceRepo.save(grievance);

    await this.auditService.record({
      grievanceId: grievance.id,
      actorId,
      action: AuditAction.STATUS_CHANGED,
      fromStatus,
      toStatus: next,
    });
  }

  async findRawById(id: string): Promise<Grievance | null> {
    return this.grievanceRepo.findOne({
      where: { id },
      relations: { category: true },
    });
  }

  async saveRaw(grievance: Grievance): Promise<Grievance> {
    return this.grievanceRepo.save(grievance);
  }

  async isEligibleById(
    grievanceId: string,
    officerId: string,
  ): Promise<boolean> {
    const grievance = await this.findRawById(grievanceId);
    const officer = await this.userRepo.findOne({
      where: { id: officerId },
      relations: { wards: true },
    });
    if (!grievance || !officer) return false;
    return this.isEligible(grievance, officer);
  }

  async getHistory(grievanceId: string, actor: { id: string; role: Role }) {
    if (actor.role === Role.CITIZEN) {
      throw new ForbiddenException('Citizens cannot view grievance history');
    }
    const grievance = await this.findRawById(grievanceId);
    if (!grievance) throw new NotFoundException('Grievance not found');
    if (actor.role === Role.OFFICER) {
      const officer = await this.userRepo.findOne({
        where: { id: actor.id },
        relations: { wards: true },
      });
      if (!officer || !this.isEligible(grievance, officer)) {
        throw new ForbiddenException(
          'Officer is not eligible for this grievance',
        );
      }
    }

    return this.auditLogRepo.find({
      where: { grievanceId },
      order: { createdAt: 'DESC' },
    });
  }

  async recategorize(
  grievanceId: string,
  dto: RecategorizeGrievanceDto,
  actor: { id: string; role: Role },
): Promise<Grievance> {
  const grievance = await this.grievanceRepo.findOne({
    where: { id: grievanceId },
    relations: { category: true },
  });
  if (!grievance) {
    throw new NotFoundException(`Grievance ${grievanceId} not found`);
  }

  if (
    actor.role === Role.OFFICER &&
    grievance.assignedOfficerId !== actor.id
  ) {
    throw new ForbiddenException(
      'Only the assigned officer can recategorize this grievance',
    );
  }

  const newCategory = await this.categoryRepo.findOne({
    where: { id: dto.categoryId },
  });
  if (!newCategory || !newCategory.isActive) {
    throw new NotFoundException(
      `Category ${dto.categoryId} not found or inactive`,
    );
  }

  const fromCategoryId = grievance.categoryId;
  const fromDepartmentId = grievance.category.departmentId;

  grievance.categoryId = newCategory.id;

  const { responseDueAt, resolutionDueAt } =
    await this.slaService.computeDeadlines(
      newCategory.id,
      grievance.priority,
      grievance.createdAt, // same cycle, corrected routing (INV-4)
    );
  grievance.responseDueAt = responseDueAt;
  grievance.resolutionDueAt = resolutionDueAt;

  await this.grievanceRepo.save(grievance);

  // INV-3: the current assignee may no longer be eligible under the new category
  await this.reconcileAssignments([grievance.id], AuditAction.RECATEGORIZED);

  await this.auditService.record({
    grievanceId: grievance.id,
    actorId: actor.id,
    action: AuditAction.RECATEGORIZED,
    metadata: {
      fromCategory: fromCategoryId,
      toCategory: newCategory.id,
      fromDepartment: fromDepartmentId,
      toDepartment: newCategory.departmentId,
    },
  });

  return this.grievanceRepo.findOneOrFail({
    where: { id: grievance.id },
    relations: { category: { department: true }, ward: true },
  });
}

async escalate(
  grievanceId: string,
  dto: EscalateGrievanceDto,
  actor: { id: string; role: Role },
): Promise<Grievance> {
  if (!dto.targetPriority && !dto.notifyAdmin) {
    throw new BadRequestException(
      'Provide targetPriority, notifyAdmin, or both',
    );
  }

  const grievance = await this.grievanceRepo.findOne({
    where: { id: grievanceId },
    relations: { category: true },
  });
  if (!grievance) {
    throw new NotFoundException(`Grievance ${grievanceId} not found`);
  }

  if (
    actor.role === Role.OFFICER &&
    grievance.assignedOfficerId !== actor.id
  ) {
    throw new ForbiddenException(
      'Only the assigned officer can escalate this grievance',
    );
  }

  const previousPriority = grievance.priority;

  if (dto.targetPriority) {
    if (PRIORITY_RANK[dto.targetPriority] <= PRIORITY_RANK[grievance.priority]) {
      throw new BadRequestException(
        'targetPriority must be higher than the current priority',
      );
    }
    grievance.priority = dto.targetPriority;

    const { responseDueAt, resolutionDueAt } =
      await this.slaService.computeDeadlines(
        grievance.categoryId,
        grievance.priority,
        grievance.createdAt, // tightens the same cycle, does not restart it
      );
    grievance.responseDueAt = responseDueAt;
    grievance.resolutionDueAt = resolutionDueAt;
    await this.grievanceRepo.save(grievance);
  }

  if (dto.notifyAdmin) {
    const admins = await this.userRepo.find({ where: { role: Role.ADMIN } });
    for (const admin of admins) {
      void this.notificationService.notify({
        userId: admin.id,
        type: NotificationType.ESCALATED,
        title: 'Grievance escalated',
        body: `Grievance ${grievance.trackingCode} was escalated${dto.reason ? `: ${dto.reason}` : ''}.`,
        grievanceId: grievance.id,
        toEmail: admin.email,
        trackingCode: grievance.trackingCode,
      });
    }
  }

  await this.auditService.record({
    grievanceId: grievance.id,
    actorId: actor.id, // human actor, unlike the scanner's system rows
    action: AuditAction.ESCALATED,
    metadata: {
      from: previousPriority,
      to: grievance.priority,
      reason: dto.reason,
      notifyAdmin: !!dto.notifyAdmin,
    },
  });

  return this.grievanceRepo.findOneOrFail({
    where: { id: grievance.id },
    relations: { category: { department: true }, ward: true },
  });
}

async summarizeGrievanceThread(grievanceId: string, actor: { id: string; role: Role }) {
  await this.findOneScoped(grievanceId, actor); // reuses your existing 404/403 rules

  const messages = await this.dataSource.getRepository(Message).find({
    where: { grievanceId },
    relations: { author: true }, // adjust relation name if different
    order: { createdAt: 'ASC' },
  });

  const result = await this.aiService.summarizeThread(
    messages.map((m) => ({ author: m.author?.fullName ?? m.authorId, body: m.body })),
  );
  return { result };
}

async suggestGrievanceReply(grievanceId: string, actor: { id: string; role: Role }) {
  const grievance = await this.findOneScoped(grievanceId, actor);
  const messages = await this.dataSource.getRepository(Message).find({
    where: { grievanceId },
    order: { createdAt: 'DESC' },
    take: 5,
  });

  const context = [
    `Title: ${grievance.title}`,
    `Description: ${grievance.description}`,
    ...messages.reverse().map((m) => `Message: ${m.body}`),
  ].join('\n');

  const result = await this.aiService.suggestReply(context);
  return { result };
}


}
