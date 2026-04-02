import 'dotenv/config'

// Neon strongly recommends using the direct non-pooled connection for migrations/schema pushes
const migrateUrl = process.env.DATABASE_URL?.replace('-pooler', '')

export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: migrateUrl,
  },
}
