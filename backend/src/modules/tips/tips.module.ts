import { Module } from '@nestjs/common';
import { TipsController } from './tips.controller';
import { GovernmentTipsController } from './government-tips.controller';
import { TipsService } from './tips.service';

@Module({
  controllers: [TipsController, GovernmentTipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}

