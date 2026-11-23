import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { WorkspaceController } from './workspace.controller';
import { RedirectController } from './redirect.controller';
import { RedirectService } from './redirect.service';

@Module({ controllers: [ComplaintsController, WorkspaceController, RedirectController], providers: [ComplaintsService, RedirectService] })
export class ComplaintsModule {}
