import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { AuditAction, Role } from 'src/common/enums';
import * as bcrypt from 'bcryptjs';
import { Department } from 'src/departments/entities/department.entity';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';
import { SetDepartmentDto } from './dto/set-department.dto';
import { Ward } from 'src/wards/entities/ward.entity';
import { SetWardsDto } from './dto/set-wards.dto';
import { In } from 'typeorm';
import { GrievancesService } from 'src/grievances/grievances.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(Ward) private readonly wardRepo: Repository<Ward>,
    private readonly grievancesService: GrievancesService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.role !== Role.OFFICER && dto.departmentId) {
      throw new BadRequestException(`${dto.role} cannot have a departmentId`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
      phone: dto.phone,
      departmentId:
        dto.role === Role.OFFICER ? (dto.departmentId ?? null) : null,
      isActive: true,
    });
    return await this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async setDepartment(userId: string, dto: SetDepartmentDto) {
    const user = await this.findById(userId);

    if (user.role !== Role.OFFICER) {
      throw new BadRequestException(
        'Only officers can be assigned a department',
      );
    }

    const dept = await this.deptRepo.findOne({
      where: { id: dto.departmentId },
    });
    if (!dept) {
      throw new NotFoundException(`Department ${dto.departmentId} not found`);
    }

    const affectedIds =
      await this.grievancesService.grievanceIdsAssignedTo(userId);

    user.departmentId = dto.departmentId;
    await this.userRepo.save(user);

    await this.grievancesService.reconcileAssignments(
      affectedIds,
      AuditAction.ASSIGNED,
    );

    return toUserResponse(user);
  }

  async setWards(userId: string, dto: SetWardsDto) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { wards: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.role !== Role.OFFICER) {
      throw new BadRequestException('Only officers can be assigned wards');
    }

    const foundWards = await this.wardRepo.find({
      where: { id: In(dto.wardIds) },
    });
    if (foundWards.length !== dto.wardIds.length) {
      const foundIds = new Set(foundWards.map((w) => w.id));
      const missing = dto.wardIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Ward(s) not found: ${missing.join(', ')}`);
    }

    const affectedIds =
      await this.grievancesService.grievanceIdsAssignedTo(userId);

    user.wards = foundWards;
    await this.userRepo.save(user);

    await this.grievancesService.reconcileAssignments(
      affectedIds,
      AuditAction.ASSIGNED,
    );

    return toUserResponse(user);
  }

  async findByIdWithWards(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { wards: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return {
      ...toUserResponse(user),
      wards: (user.wards ?? []).map((ward) => ({
        id: ward.id,
        name: ward.name,
        code: ward.code,
      })),
    };
  }
  async getAdminIds(): Promise<string[]> {
  const admins = await this.userRepo.find({ where: { role: Role.ADMIN } });
  return admins.map((a) => a.id);
}

async findAll(query: { role?: Role; departmentId?: string; page?: number; limit?: number }) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const qb = this.userRepo.createQueryBuilder('u');
  if (query.role) qb.andWhere('u.role = :role', { role: query.role });
  if (query.departmentId) qb.andWhere('u.departmentId = :departmentId', { departmentId: query.departmentId });
  const [users, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
  return { data: users.map(toUserResponse), total, page, limit };
}

async deactivate(id: string): Promise<void> {
  const user = await this.userRepo.findOne({ where: { id } });
  if (!user) throw new NotFoundException('User not found');
  if (!user.isActive) return;

  user.isActive = false;
  await this.userRepo.save(user);

  if (user.role === Role.OFFICER) {
    const grievanceIds = await this.grievancesService.grievanceIdsAssignedTo(user.id);
    if (grievanceIds.length) {
      await this.grievancesService.reconcileAssignments(grievanceIds, AuditAction.ASSIGNED);
    }
  }
}

}
