import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Ward } from './entities/ward.entity';
import { Repository } from 'typeorm';
import { CreateWardDto } from './dto/create-ward.dto';
import { UpdateWardDto } from './dto/update-ward.dto';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';

@Injectable()
export class WardsService {
  constructor(
    @InjectRepository(Ward) private readonly wardRepo: Repository<Ward>,
  ) {}

  async create(dto: CreateWardDto) {
    const existing = await this.wardRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Ward with code ${dto.code} already exists`);
    }
    const ward = this.wardRepo.create(dto);
    return this.wardRepo.save(ward);
  }

  async findAll() {
    return await this.wardRepo.find();
  }

  async findOne(id: string) {
    const ward = await this.wardRepo.findOne({ where: { id } });
    if (!ward) {
      throw new NotFoundException(`Ward with id ${id} not found`);
    }
    return ward;
  }

  async update(id: string, dto: UpdateWardDto) {
    const ward = await this.findOne(id);

    if (dto.code && dto.code !== ward.code) {
      const existing = await this.wardRepo.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(
          `Ward with code ${dto.code} already exists`,
        );
      }
    }

    Object.assign(ward, dto);
    return await this.wardRepo.save(ward);
  }

  async findOfficers(wardId: string) {
    const ward = await this.wardRepo.findOne({
      where: { id: wardId },
      relations: { officers: true },
    });
    if (!ward) throw new NotFoundException('Ward not found');
    return (ward.officers ?? []).map(toUserResponse);
  }
}
