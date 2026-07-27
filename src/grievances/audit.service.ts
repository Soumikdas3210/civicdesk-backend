import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction, GrievanceStatus } from 'src/common/enums';

interface RecordAuditEntry {
  grievanceId: string;
  actorId?: string | null;
  action: AuditAction;
  fromStatus?: GrievanceStatus;
  toStatus?: GrievanceStatus;
  escalationRuleId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async record(entry: RecordAuditEntry) {
    const log = this.auditRepo.create(entry);
    return await this.auditRepo.save(log);
  }

  
}
