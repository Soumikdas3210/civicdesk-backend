import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CannedResponse } from './entities/canned-response.entity';
import { CreateCannedResponseDto } from './dto/create-canned-response.dto';
import { UpdateCannedResponseDto } from './dto/update-canned-response.dto';

@Injectable()
export class CannedResponsesService {
  constructor(
    @InjectRepository(CannedResponse)
    private readonly repo: Repository<CannedResponse>,
  ) {}

  async create(dto: CreateCannedResponseDto, adminId: string): Promise<CannedResponse> {
    const entity = this.repo.create({ ...dto, createdById: adminId });
    return this.repo.save(entity);
  }

  async findAll(): Promise<CannedResponse[]> {
    return this.repo.find({ order: { title: 'ASC' } });
  }

  async findForOfficer(departmentId?: string | null): Promise<CannedResponse[]> {
    const qb = this.repo.createQueryBuilder('c').where('c.departmentId IS NULL');
    if (departmentId) {
      qb.orWhere('c.departmentId = :deptId', { deptId: departmentId });
    }
    return qb.orderBy('c.title', 'ASC').getMany();
  }

  async update(id: string, dto: UpdateCannedResponseDto): Promise<CannedResponse> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Canned response ${id} not found`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException(`Canned response ${id} not found`);
  }
}