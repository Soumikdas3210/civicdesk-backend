import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscalationRule } from './entities/escalation-rule.entity';
import { EscalationRulesService } from './escalation-rules.service';
import { EscalationRulesController } from './escalation-rules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EscalationRule])],
  controllers: [EscalationRulesController],
  providers: [EscalationRulesService],
  exports: [EscalationRulesService],
})
export class EscalationRulesModule {}