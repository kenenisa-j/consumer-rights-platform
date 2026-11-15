import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { Public } from '../../lib/common/decorators/public.decorator';

const KINDS = ['news', 'law', 'faq'] as const;

/** Published public content: news, laws and documents, questions and answers. Written by the content administrator. */
@Controller('content')
export class ContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':kind')
  async list(@Param('kind') kind: string) {
    if (!(KINDS as readonly string[]).includes(kind)) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Unknown content type.' });
    const rows = await this.prisma.contentItem.findMany({
      where: { kind, isPublished: true, publishedAt: { lte: new Date() } },
      orderBy: kind === 'news' ? [{ publishedAt: 'desc' }] : [{ sortOrder: 'asc' }],
      select: { slug: true, data: true, publishedAt: true },
    });
    return rows.map(r => ({ slug: r.slug, publishedAt: r.publishedAt.toISOString(), ...(r.data as object) }));
  }
}
