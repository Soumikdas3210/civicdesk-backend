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
import { Role } from 'src/common/enums';
import * as bcrypt from 'bcryptjs';
import { Department } from 'src/departments/entities/department.entity';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';
import { SetDepartmentDto } from './dto/set-department.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
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
    user.departmentId = dto.departmentId;
    await this.userRepo.save(user);

    // TODO(4.4): const affected = await this.grievanceService.grievanceIdsAssignedTo(userId);
    //            await this.grievanceService.reconcileAssignments(affected, AuditAction.ASSIGNED);

    return toUserResponse(user);
  }
}
