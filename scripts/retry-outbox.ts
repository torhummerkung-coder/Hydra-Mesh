import { drainOutbox } from '../lib/fallback/outbox';
import { deliverJob } from '../lib/fallback/delivery';
import { prisma } from '../lib/db';
async function main() {
  const result = await drainOutbox(deliverJob);
  console.log(JSON.stringify(result)); // counts only, no patient data
  if (result.failed) process.exitCode = 1;
}
main().catch(() => { console.error('Outbox unavailable; inspect configuration and persistent volume.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
