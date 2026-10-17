
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/env.js';

const customLevels = {
    levels: {
        fatal: 0,
        error: 1,
        warning: 2,
        info: 3,
        http: 4,
        debug: 5
    },
    colors: {
        fatal: 'magenta',
        error: 'red',
        warning: 'yellow',
        info: 'green',
        http: 'cyan',
        debug: 'blue'
    }
};

winston.addColors(customLevels.colors);

const isProduction = config.nodeEnv === 'production';

const messageFormat = winston.format.printf(
    ({ timestamp, level, message, stack }) => {
        const text = stack || message;

        return `${timestamp} [${level}] ${text}`;
    }
);

const productionFormat = winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    messageFormat
);

const developmentFormat = winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    messageFormat
);

const transports = [
    new winston.transports.Console({
        level: config.logLevel || 'info',
        format: isProduction
            ? productionFormat
            : developmentFormat
    })
];

// En desarrollo mantenemos archivos de log locales.
// En producción, Render recibe los logs mediante stdout/stderr.
if (!isProduction) {
    transports.push(
        new DailyRotateFile({
            level: 'info',
            dirname: 'logs',
            filename: 'combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            format: productionFormat
        })
    );

    transports.push(
        new DailyRotateFile({
            level: 'error',
            dirname: 'logs',
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            format: productionFormat
        })
    );
}

const logger = winston.createLogger({
    levels: customLevels.levels,
    level: config.logLevel || 'info',
    transports,
    exitOnError: false
});

export default logger;
