import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Determine log level based on environment
const logLevel = process.env.LOG_LEVEL || 
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logs directory path
const logsDir = path.join(process.cwd(), 'logs');

// Winston format configuration
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Daily rotate file transport for errors
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '30d',
  maxSize: '20m',
  format: logFormat,
});

// Daily rotate file transport for all logs
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m',
  format: logFormat,
});

// Create winston logger
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports: [
    errorFileTransport,
    combinedFileTransport,
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Helper methods for structured logging
export const log = {
  error: (message: string, meta?: Record<string, unknown>) => {
    logger.error(message, meta);
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    logger.warn(message, meta);
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    logger.info(message, meta);
  },
  http: (message: string, meta?: Record<string, unknown>) => {
    logger.http(message, meta);
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    logger.debug(message, meta);
  },
  
  // Request logging helper
  request: (req: { method: string; url: string; ip: string }, meta?: Record<string, unknown>) => {
    logger.http(`${req.method} ${req.url}`, {
      ip: req.ip,
      ...meta,
    });
  },
  
  // Database logging helper
  db: (operation: string, meta?: Record<string, unknown>) => {
    logger.debug(`DB: ${operation}`, meta);
  },
};

export default logger;
