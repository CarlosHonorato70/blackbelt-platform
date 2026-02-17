/**
 * Sistema de Logging Profissional com Winston
 *
 * Características:
 * - Níveis de log configuráveis
 * - Rotação diária de arquivos
 * - Formato estruturado (JSON)
 * - Console formatado para desenvolvimento
 * - Integração com Express (Morgan)
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';

// Formato customizado para logs estruturados
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para console (desenvolvimento) - mais legível
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Adicionar metadata se existir
    const metaKeys = Object.keys(metadata).filter(key => key !== 'timestamp');
    if (metaKeys.length > 0) {
      const metaStr = JSON.stringify(
        Object.fromEntries(metaKeys.map(key => [key, metadata[key]])),
        null,
        2
      );
      msg += `\n${metaStr}`;
    }

    return msg;
  })
);

// Configurar transports
const transports: winston.transport[] = [
  // Console (sempre ativo)
  new winston.transports.Console({
    format: isProduction ? customFormat : consoleFormat,
  }),
];

// Em produção, adicionar rotação de arquivos
if (isProduction) {
  // Logs de erro (level: error)
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: customFormat,
      zippedArchive: true,
    })
  );

  // Todos os logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: customFormat,
      zippedArchive: true,
    })
  );

  // Logs de HTTP (requisições)
  transports.push(
    new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '7d',
      format: customFormat,
      zippedArchive: true,
    })
  );
}

// Criar logger
export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports,
  exitOnError: false,
});

// Helper functions para uso mais fácil
export const logInfo = (message: string, meta?: Record<string, any>) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | any) => {
  logger.error(message, {
    error: error?.message || error,
    stack: error?.stack,
    ...(typeof error === 'object' && error !== null ? error : {}),
  });
};

export const logWarn = (message: string, meta?: Record<string, any>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: Record<string, any>) => {
  logger.http(message, meta);
};

// Stream para Morgan (HTTP request logging)
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Log de inicialização
logger.info('Logger initialized', {
  level: logLevel,
  environment: process.env.NODE_ENV,
  production: isProduction,
});

// Exportar logger como default também
export default logger;
