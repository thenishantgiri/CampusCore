import pino from 'pino';
import pretty from 'pino-pretty';

// Configure the pretty stream with a simpler format
const stream = pretty({
  colorize: true,
  translateTime: 'yyyy-mm-dd HH:MM:ss',
  ignore: 'pid,hostname',
  // Use a simpler message format that doesn't try to be too clever
  messageFormat: '{msg}',
});

const logger = pino(
  {
    base: undefined,
    // This is critical - flatten nested objects in the log output
    formatters: {
      level: (label) => ({ level: label }),
      // This merges child logger bindings with the parent
      bindings: (bindings) => bindings,
    },
  },
  stream,
);

export default logger;
