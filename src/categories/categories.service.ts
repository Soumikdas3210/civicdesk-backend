import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Department } from 'src/departments/entities/department.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SLAPolicy } from 'src/sla/entities/sla-policy.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(SLAPolicy)
    private readonly slaRepo: Repository<SLAPolicy>,
  ) {}

  private async assertDepartmentExists(departmentId: string) {
    const dept = await this.deptRepo.findOne({ where: { id: departmentId } });
    if (!dept) {
      throw new NotFoundException(
        `Department with ID ${departmentId} not found`,
      );
    }
  }

  async create(dto: CreateCategoryDto) {
    await this.assertDepartmentExists(dto.departmentId);
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async findAll(departmentId?: string, includeInactive: boolean = false) {
    const where: FindOptionsWhere<Category> = {};
    if (departmentId) where.departmentId = departmentId;
    if (!includeInactive) where.isActive = true;
    return await this.categoryRepo.find({ where });
  }

  async findOne(id: string) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (dto.departmentId) {
      await this.assertDepartmentExists(dto.departmentId);
    }

    Object.assign(category, dto);
    return await this.categoryRepo.save(category);
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const policyCount = await this.slaRepo.count({ where: { categoryId: id } });
    if (policyCount > 0) {
      throw new ConflictException(
        `Cannot delete a category referenced by an SLA policy. retire it with isActive: false instead`,
      );
    }
    await this.categoryRepo.delete(id);
    return { deleted: true };
  }
}
