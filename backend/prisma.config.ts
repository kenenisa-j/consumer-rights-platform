import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://consumer_rights:REPLACE_WITH_RANDOM_PASSWORD@127.0.0.1:5546/consumer_rights',
  },
});

