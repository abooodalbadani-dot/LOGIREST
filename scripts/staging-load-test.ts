import { PrismaClient } from '@prisma/client';

interface LoadTestConfig {
  concurrency: number;
  durationSeconds: number;
  baseUrl: string;
}

interface LoadTestMetrics {
  runId: string;
  timestamp: string;
  concurrencyRPS: number;
  durationSeconds: number;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    p50LatencyMS: number;
    p95LatencyMS: number;
    p99LatencyMS: number;
    deadlocksCount: number;
  };
  status: 'SUCCESS' | 'FAILURE';
  errors: string[];
}

function generateRunId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `ltr-${date}-${time}`;
}

function parseArgs(): LoadTestConfig {
  const args = process.argv.slice(2);
  const config: LoadTestConfig = {
    concurrency: 50,
    durationSeconds: 60,
    baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--concurrency' && args[i + 1]) {
      config.concurrency = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--duration' && args[i + 1]) {
      config.durationSeconds = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return config;
}

async function runLoadTest(config: LoadTestConfig): Promise<LoadTestMetrics> {
  const prisma = new PrismaClient();
  const metrics: LoadTestMetrics = {
    runId: generateRunId(),
    timestamp: new Date().toISOString(),
    concurrencyRPS: config.concurrency,
    durationSeconds: config.durationSeconds,
    metrics: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      p50LatencyMS: 0,
      p95LatencyMS: 0,
      p99LatencyMS: 0,
      deadlocksCount: 0,
    },
    status: 'SUCCESS',
    errors: [],
  };

  const latencies: number[] = [];
  const startTime = Date.now();
  const endTime = startTime + config.durationSeconds * 1000;
  let requestIndex = 0;

  console.log(`[load-test] Starting: ${config.concurrency} RPS for ${config.durationSeconds}s`);
  console.log(`[load-test] Run ID: ${metrics.runId}`);

  try {
    while (Date.now() < endTime) {
      const batchStart = Date.now();
      const batch: Promise<void>[] = [];

      for (let i = 0; i < config.concurrency; i++) {
        batch.push(
          (async () => {
            const reqStart = Date.now();
            requestIndex++;
            try {
              const items = await prisma.item.findMany({
                take: 10,
                select: { id: true, name: true },
              });
              const latency = Date.now() - reqStart;
              latencies.push(latency);
              metrics.metrics.successfulRequests++;
            } catch (err: any) {
              metrics.metrics.failedRequests++;
              if (err.message?.includes('deadlock') || err.message?.includes('Deadlock')) {
                metrics.metrics.deadlocksCount++;
              }
              metrics.errors.push(`Request ${requestIndex}: ${err.message}`);
            }
          })(),
        );
      }

      await Promise.allSettled(batch);
      metrics.metrics.totalRequests += config.concurrency;

      const batchDuration = Date.now() - batchStart;
      const sleepMs = Math.max(0, 1000 - batchDuration);
      await new Promise((r) => setTimeout(r, sleepMs));
    }
  } finally {
    await prisma.$disconnect();
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const len = sorted.length;
  metrics.metrics.p50LatencyMS = len > 0 ? sorted[Math.floor(len * 0.5)] : 0;
  metrics.metrics.p95LatencyMS = len > 0 ? sorted[Math.floor(len * 0.95)] : 0;
  metrics.metrics.p99LatencyMS = len > 0 ? sorted[Math.floor(len * 0.99)] : 0;

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalAttempted = metrics.metrics.totalRequests;

  if (metrics.metrics.deadlocksCount > 0) {
    metrics.status = 'FAILURE';
    metrics.errors.push(`Deadlocks detected: ${metrics.metrics.deadlocksCount}`);
  }
  if (metrics.metrics.p95LatencyMS > 500) {
    metrics.status = 'FAILURE';
    metrics.errors.push(`p95 latency ${metrics.metrics.p95LatencyMS}ms exceeds 500ms threshold`);
  }
  const successRate = totalAttempted > 0
    ? (metrics.metrics.successfulRequests / totalAttempted) * 100
    : 0;
  if (successRate < 99.5) {
    metrics.status = 'FAILURE';
    metrics.errors.push(`Success rate ${successRate.toFixed(1)}% below 99.5% threshold`);
  }

  console.log(`\n[load-test] Completed in ${elapsed}s`);
  console.log(`[load-test] Total: ${totalAttempted} | Success: ${metrics.metrics.successfulRequests} | Failed: ${metrics.metrics.failedRequests}`);
  console.log(`[load-test] Latency p50: ${metrics.metrics.p50LatencyMS}ms | p95: ${metrics.metrics.p95LatencyMS}ms | p99: ${metrics.metrics.p99LatencyMS}ms`);
  console.log(`[load-test] Deadlocks: ${metrics.metrics.deadlocksCount}`);
  console.log(`[load-test] Status: ${metrics.status}`);

  if (metrics.errors.length > 0) {
    console.log(`[load-test] Errors (${metrics.errors.length}):`);
    metrics.errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
  }

  return metrics;
}

const config = parseArgs();
runLoadTest(config)
  .then((metrics) => {
    process.exit(metrics.status === 'SUCCESS' ? 0 : 1);
  })
  .catch((err) => {
    console.error('[load-test] Fatal:', err);
    process.exit(1);
  });
