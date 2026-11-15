import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { MessagesService } from './messages.service';

type Authed = Request & { user: { id: string } };

/** Conversations of a complaint, for the consumer, the business and the office that holds it. Scope is decided in the service. */
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('conversations')
  @RequirePermission('messages.use')
  list(@Req() req: Authed) { return this.messages.list(req.user.id); }

  @Get('conversations/:id')
  @RequirePermission('messages.use')
  thread(@Req() req: Authed, @Param('id') id: string) { return this.messages.thread(req.user.id, id); }

  @Post('conversations/:id/text')
  @RequirePermission('messages.use')
  text(@Req() req: Authed, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.messages.sendText(req.user.id, id, body?.text); }

  @Post('conversations/:id/voice')
  @RequirePermission('messages.use')
  voice(@Req() req: Authed, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.messages.sendVoice(req.user.id, id, body ?? {}); }

  @Get('audio/:messageId')
  @RequirePermission('messages.use')
  async audio(@Req() req: Authed, @Param('messageId') messageId: string, @Res() res: Response) {
    const { bytes, mime } = await this.messages.audio(req.user.id, messageId);
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(bytes);
  }
}
