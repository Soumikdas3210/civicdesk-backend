import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { Department } from 'src/departments/entities/department.entity';
import { SLAPolicy } from 'src/sla/entities/sla-policy.entity';

describe('CategoriesService', () => {
  let categoriesService: CategoriesService;
  let categoryRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let deptRepo: { findOne: jest.Mock };
  let slaRepo: { count: jest.Mock };

  beforeEach(async () => {
    categoryRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto: Partial<Category>) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'new-id', ...entity })),
      delete: jest.fn(),
    };
    deptRepo = { findOne: jest.fn() };
    slaRepo = { count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(Department), useValue: deptRepo },
        { provide: getRepositoryToken(SLAPolicy), useValue: slaRepo },
      ],
    }).compile();

    categoriesService = module.get(CategoriesService);
  });

  it('rejects creating a category with an invalid departmentId (INV-2)', async () => {
    deptRepo.findOne.mockResolvedValue(null);

    await expect(
      categoriesService.create({
        name: 'Pipe Leak',
        departmentId: 'nonexistent-dept',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects deleting a category referenced by an SLA policy (INV-2)', async () => {
    categoryRepo.findOne.mockResolvedValue({ id: 'cat-1', name: 'Pipe Leak' });
    slaRepo.count.mockResolvedValue(1);

    await expect(categoriesService.remove('cat-1')).rejects.toThrow(
      ConflictException,
    );
  });
});
