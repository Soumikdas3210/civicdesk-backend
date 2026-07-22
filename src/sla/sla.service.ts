import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SLAPolicy } from './entities/sla-policy.entity';
import { Repository } from 'typeorm';
import { Category } from 'src/categories/entities/category.entity';
import { CreateSLAPolicyDto } from './dto/create-sla-policy.dto';
import { Priority } from 'src/common/enums';
import { UpdateSLAPolicyDto } from './dto/update-sla-policy.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SlaService {
  constructor(
    @InjectRepository(SLAPolicy)
    private readonly policyRepo: Repository<SLAPolicy>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly cfg: ConfigService,
  ) {}

  private async assertCategoryExists(categoryId: string) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }
  }

  private async assertNoDuplicate(
    categoryId: string,
    priority: Priority,
    excludeId?: string,
  ) {
    const existing = await this.policyRepo.findOne({
      where: { categoryId, priority },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `SLA Policy for category ${categoryId} and priority ${priority} already exists`,
      );
    }
  }

  async create(dto: CreateSLAPolicyDto) {
    await this.assertCategoryExists(dto.categoryId);
    await this.assertNoDuplicate(dto.categoryId, dto.priority);

    const policy = this.policyRepo.create(dto);
    return this.policyRepo.save(policy);
  }

  async findAll() {
    return await this.policyRepo.find();
  }

  async findOne(id: string) {
    const policy = await this.policyRepo.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException(`SLA Policy with ID ${id} not found`);
    }
    return policy;
  }

  async update(id: string, dto: UpdateSLAPolicyDto) {
    const policy = await this.findOne(id);

    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);

    const nextCategoryId = dto.categoryId ?? policy.categoryId;
    const nextPriority = dto.priority ?? policy.priority;
    await this.assertNoDuplicate(nextCategoryId, nextPriority, id);

    Object.assign(policy, dto);
    return await this.policyRepo.save(policy);
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`SLA Policy with ID ${id} not found`);
    }
    await this.policyRepo.remove(existing);
    return { deleted: true, id };
  }

  async computeDeadlines(
    categoryId: string,
    priority: Priority,
    from: Date = new Date(),
  ) {
    const policy = await this.policyRepo.findOne({
      where: { categoryId, priority },
    });

    const responseHours =
      policy?.responseDueHours ??
      +this.cfg.get<string>('GLOBAL_DEFAULT_RESPONSE_HOURS')!;
    const resolutionHours =
      policy?.resolutionDueHours ??
      +this.cfg.get<string>('GLOBAL_DEFAULT_RESOLUTION_HOURS')!;

    return {
      responseDueAt: new Date(from.getTime() + responseHours * 3600_000),
      resolutionDueAt: new Date(from.getTime() + resolutionHours * 3600_000),
    };
  }
}
