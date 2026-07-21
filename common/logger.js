const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, "app.log");
const SENSITIVE_KEYS = ["password", "token", "authorization"];

function clean(meta) {
  if (!meta || typeof meta !== "object") return meta;
  const copy = { ...meta };
  for (const key of Object.keys(copy)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      copy[key] = "[REDACTED]";
    }
  }
  return copy;
}

function write(level, message, meta) {
  const line = {
    level,
    message,
    ...clean(meta),
    time: new Date().toISOString(),
  };

  const text = JSON.stringify(line);
  fs.appendFileSync(logFile, text + "\n");
  console.log(`[${level.toUpperCase()}] ${message}`, meta ? clean(meta) : "");
}

module.exports = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
};