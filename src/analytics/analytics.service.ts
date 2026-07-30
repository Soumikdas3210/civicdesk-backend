import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Grievance } from 'src/grievances/entities/grievance.entity';
import { GrievanceStatus } from 'src/common/enums';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Grievance) private readonly grievanceRepo: Repository<Grievance>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getOverview() {
    const rows = await this.grievanceRepo
      .createQueryBuilder('g')
      .select('g.status', 'status')
      .addSelect('COUNT(g.id)', 'count')
      .groupBy('g.status')
      .getRawMany();

    const byStatus: Record<string, number> = Object.fromEntries(
      Object.values(GrievanceStatus).map((s) => [s, 0]),
    );
    let total = 0;
    for (const row of rows) {
      byStatus[row.status] = Number(row.count);
      total += Number(row.count);
    }

    const breach = await this.grievanceRepo
      .createQueryBuilder('g')
      .select('COUNT(*) FILTER (WHERE g.responseBreached = true)', 'responseBreaches')
      .addSelect('COUNT(*) FILTER (WHERE g.resolutionBreached = true)', 'resolutionBreaches')
      .getRawOne();

    return {
      byStatus,
      total,
      openCount: total - byStatus.RESOLVED - byStatus.CLOSED,
      resolvedCount: byStatus.RESOLVED + byStatus.CLOSED,
      // current-cycle rate; see getSlaStats() note for the lifetime alternative
      responseBreachRate: total ? Number(breach.responseBreaches) / total : 0,
      resolutionBreachRate: total ? Number(breach.resolutionBreaches) / total : 0,
    };
  }

  async getOfficerStats() {
    return this.dataSource.query(`
      SELECT u.id, u."fullName",
             COUNT(g.id)                                                  AS assigned,
             COUNT(g.id) FILTER (WHERE g.status IN ('RESOLVED','CLOSED')) AS resolved,
             AVG(EXTRACT(EPOCH FROM (g."resolvedAt" - g."createdAt")) / 3600) AS "avgResolutionHours",
             AVG(r.score)                                                 AS "avgCsat"
      FROM users u
      LEFT JOIN grievances g ON g."assignedOfficerId" = u.id
      LEFT JOIN ratings r    ON r."grievanceId" = g.id
      WHERE u.role = 'officer'
      GROUP BY u.id, u."fullName"
    `);
  }

  async getDepartmentStats() {
    return this.dataSource.query(`
      SELECT d.id, d.name,
             COUNT(g.id) AS total,
             COUNT(g.id) FILTER (WHERE g."responseBreached" = true)   AS "responseBreaches",
             COUNT(g.id) FILTER (WHERE g."resolutionBreached" = true) AS "resolutionBreaches"
      FROM departments d
      LEFT JOIN categories c ON c."departmentId" = d.id
      LEFT JOIN grievances g ON g."categoryId" = c.id
      GROUP BY d.id, d.name
    `);
  }

  async getCategoryStats() {
    return this.dataSource.query(`
      SELECT c.id, c.name,
             COUNT(g.id) AS total,
             COUNT(g.id) FILTER (WHERE g."responseBreached" = true OR g."resolutionBreached" = true) AS breaches
      FROM categories c
      LEFT JOIN grievances g ON g."categoryId" = c.id
      GROUP BY c.id, c.name
    `);
  }

  async getWardStats() {
    return this.dataSource.query(`
      SELECT w.id, w.name,
             COUNT(g.id) AS total,
             COUNT(g.id) FILTER (WHERE g."responseBreached" = true OR g."resolutionBreached" = true) AS breaches
      FROM wards w
      LEFT JOIN grievances g ON g."wardId" = w.id
      GROUP BY w.id, w.name
    `);
  }

  async getSlaStats() {
    return this.dataSource.query(`
      SELECT d.name AS department, g.priority,
             COUNT(g.id) FILTER (WHERE g."responseBreached" = true)   AS "responseBreaches",
             COUNT(g.id) FILTER (WHERE g."resolutionBreached" = true) AS "resolutionBreaches",
             COUNT(g.id) AS total
      FROM grievances g
      JOIN categories c  ON c.id = g."categoryId"
      JOIN departments d ON d.id = c."departmentId"
      GROUP BY d.name, g.priority
    `);
    // this is current-cycle. lifetime alternative:
    // SELECT COUNT(*) FROM audit_logs WHERE action = 'BREACH_FLAGGED'
  }
}