import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { WorkspaceController } from './workspace.controller';

@Module({ controllers: [ComplaintsController, WorkspaceController], providers: [ComplaintsService] })
export class ComplaintsModule {}
