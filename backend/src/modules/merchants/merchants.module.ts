import { Module } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { BusinessDeskService } from './business-desk.service';
import { MerchantsController } from './merchants.controller';
import { BusinessMeController } from './business-me.controller';

@Module({
  controllers: [MerchantsController, BusinessMeController],
  providers: [MerchantsService, BusinessDeskService],
  exports: [MerchantsService, BusinessDeskService],
})
export class MerchantsModule {}

