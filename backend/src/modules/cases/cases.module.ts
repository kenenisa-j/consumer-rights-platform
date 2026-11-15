import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { ConsumerCasesService } from './consumer-cases.service';
import { BusinessCasesController } from './business-cases.controller';
import { BusinessCasesService } from './business-cases.service';
import { GovernmentCasesController } from './government-cases.controller';
import { GovernmentCasesService } from './government-cases.service';
import { GovernmentInvestigationsController } from './government-investigations.controller';
import { GovernmentInvestigationsService } from './government-investigations.service';
import { GovernmentDecisionsController } from './government-decisions.controller';
import { GovernmentDecisionsService } from './government-decisions.service';
import { GovernmentTransfersController } from './government-transfers.controller';
import { GovernmentTransfersService } from './government-transfers.service';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [
    CasesController,
    BusinessCasesController,
    GovernmentCasesController,
    GovernmentInvestigationsController,
    GovernmentDecisionsController,
    GovernmentTransfersController,
    EvidenceController,
  ],
  providers: [
    CasesService,
    ConsumerCasesService,
    BusinessCasesService,
    GovernmentCasesService,
    GovernmentInvestigationsService,
    GovernmentDecisionsService,
    GovernmentTransfersService,
    EvidenceService,
  ],
  exports: [
    CasesService,
    ConsumerCasesService,
    BusinessCasesService,
    GovernmentCasesService,
    GovernmentInvestigationsService,
    GovernmentDecisionsService,
    GovernmentTransfersService,
    EvidenceService,
  ],
})
export class CasesModule {}
