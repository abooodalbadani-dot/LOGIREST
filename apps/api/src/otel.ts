import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [new PrismaInstrumentation()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((err) => console.log('Error terminating tracing', err))
    .finally(() => process.exit(0));
});
