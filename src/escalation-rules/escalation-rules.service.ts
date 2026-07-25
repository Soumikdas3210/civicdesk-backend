import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscalationRule } from './entities/escalation-rule.entity';
import { CreateEscalationRuleDto } from './dto/create-escalation-rule.dto';
import { UpdateEscalationRuleDto } from './dto/update-escalation-rule.dto';

@Injectable()
export class EscalationRulesService {
  constructor(
    @InjectRepository(EscalationRule)
    private readonly repo: Repository<EscalationRule>,
  ) {}

  create(dto: CreateEscalationRuleDto): Promise<EscalationRule> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<EscalationRule[]> {
    return this.repo.find();
  }

  async findOne(id: string): Promise<EscalationRule> {
    const rule = await this.repo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Escalation rule ${id} not found`);
    return rule;
  }

  async update(id: string, dto: UpdateEscalationRuleDto): Promise<EscalationRule> {
    const rule = await this.findOne(id);
    Object.assign(rule, dto);
    return this.repo.save(rule);
  }

  async remove(id: string): Promise<void> {
    const rule = await this.findOne(id);
    await this.repo.remove(rule);
  }
}