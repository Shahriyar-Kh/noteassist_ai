// Lightweight logger: suppresses console output in production and funnels to monitoring hook
const isProd = process.env.NODE_ENV === 'production';

function sendToMonitoring(level, args) {
  // Placeholder: integrate Sentry/LogRocket in production if desired
  // e.g., window._monitor?.capture({ level, message: args[0], meta: args.slice(1) })
}

const logger = {
  log: (...args) => { if (!isProd) console.log(...args); else sendToMonitoring('log', args); },
  info: (...args) => { if (!isProd) console.info(...args); else sendToMonitoring('info', args); },
  warn: (...args) => { if (!isProd) console.warn(...args); else sendToMonitoring('warn', args); },
  error: (...args) => { if (!isProd) console.error(...args); else sendToMonitoring('error', args); },
  debug: (...args) => { if (!isProd) console.debug(...args); else {/* no-op in prod */} },
};

export default logger;
