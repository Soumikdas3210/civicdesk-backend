import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateDepartmentDto) {
    const existing = await this.deptRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(
        `Department with name '${dto.name}' already exists`,
      );
    }

    const dept = this.deptRepo.create(dto);
    return await this.deptRepo.save(dept);
  }

  async findAll() {
    return await this.deptRepo.find();
  }

  async findOne(id: string) {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) {
      throw new NotFoundException(`Department not found`);
    }
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const dept = await this.findOne(id);

    if (dto.name && dto.name !== dept.name) {
      const existing = await this.deptRepo.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Department with name '${dto.name}' already exists`,
        );
      }
    }

    Object.assign(dept, dto);
    return await this.deptRepo.save(dept);
  }

  async remove(id: string) {
    await this.findOne(id);

    const officerCount = await this.userRepo.count({
      where: { departmentId: id },
    });
    if (officerCount > 0) {
      throw new ConflictException(
        `Cannot delete department with assigned officers`,
      );
    }

    await this.deptRepo.delete(id);
    return { deleted: true };
  }
}
