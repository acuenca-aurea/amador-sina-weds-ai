type LogMeta = Record<string, unknown>;

const logger = {
  info: (message: string, meta?: LogMeta) => {
    console.log(
      JSON.stringify({
        level: "info",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      })
    );
  },
  warn: (message: string, meta?: LogMeta) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      })
    );
  },
  error: (message: string, error?: Error, meta?: LogMeta) => {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        timestamp: new Date().toISOString(),
        error: error?.message,
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
        ...meta,
      })
    );
  },
};

export default logger;
