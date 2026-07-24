import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from "typeorm";
import { Grievance } from "./grievance.entity";
import { User } from "src/users/entities/user.entity";
import { AuditAction, GrievanceStatus } from 'src/common/enums';


@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Grievance, grievance => grievance.auditLogs)
    @JoinColumn({
        name: 'grievanceId',
    })
    grievance: Grievance;
    @Column({
        type: 'uuid',
    })
    grievanceId: string;    

    // NULLABLE. null = the system acted. Used by auto-close, the breach
    // scanner, rule application, and INV-3's reconciler. One convention, everywhere.
    @ManyToOne(() => User, {
        nullable: true,
    })
    @JoinColumn({
        name: 'actorId'
    })
    actor?: User;
    @Column({
        type: 'uuid',
        nullable: true,
    })
    actorId?: string | null;

    @Column({
        type: 'enum',
        enum: AuditAction,
        enumName: 'audit_action_enum',
    })
    action: AuditAction;

    @Column({
        type: 'enum',
        enum: GrievanceStatus,
        enumName: 'grievance_status_enum',
        nullable: true,
    })
    fromStatus?: GrievanceStatus;

    @Column({
        type: 'enum',
        enum: GrievanceStatus,
        enumName: 'grievance_status_enum',
        nullable: true,
    })
    toStatus?: GrievanceStatus;

    // NULLABLE, unused until Phase 2. The escalation engine queries
    // (escalationRuleId, grievanceId) to enforce INV-7 idempotency.
    @Column({
        type: 'uuid',
        nullable: true,
    })
    escalationRuleId?: string;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    metadata?: Record<string, unknown>;

    @CreateDateColumn({
        type: 'timestamptz',
    })
    createdAt: Date;
}