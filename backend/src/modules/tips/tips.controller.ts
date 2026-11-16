import {
  Controller,
  Post,
  Get,
  Body,
  Query,
} from '@nestjs/common';
import { TipsService } from './tips.service';
import { CreateTipDto } from './dto/create-tip.dto';
import { TrackTipDto } from './dto/track-tip.dto';
import { Public } from '../../lib/common/decorators/public.decorator';

@Controller('tips')
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

  @Public()
  @Post()
  async submitTip(@Body() dto: CreateTipDto) {
    return this.tipsService.submitTip(dto);
  }

  @Public()
  @Post('track')
  async trackTip(@Body() dto: TrackTipDto) {
    return this.tipsService.trackTip(dto);
  }

  @Public()
  @Get('track')
  async trackTipQuery(@Query() dto: TrackTipDto) {
    return this.tipsService.trackTip(dto);
  }
}

