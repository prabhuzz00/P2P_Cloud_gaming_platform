const fs = require('fs');
        const path = require('path');

        function resolveDataDirectory() {
          try {
            const { app } = require('electron');
            if (app?.isReady?.()) {
              const dir = path.join(app.getPath('userData'), 'host-data');
              fs.mkdirSync(dir, { recursive: true });
              return dir;
            }
          } catch (_error) {
          }

          const fallbackDir = path.join(process.cwd(), '.host-data');
          fs.mkdirSync(fallbackDir, { recursive: true });
          return fallbackDir;
        }

        function getLogFilePath() {
          return path.join(resolveDataDirectory(), 'host.log');
        }

        function formatMessage(level, message, metadata) {
          const timestamp = new Date().toISOString();
          const serializedMetadata = metadata
            ? ` ${typeof metadata === 'string' ? metadata : JSON.stringify(metadata)}`
            : '';
          return `[${timestamp}] [${level}] ${message}${serializedMetadata}`;
        }

        function write(level, message, metadata) {
          const line = formatMessage(level, message, metadata);
          fs.appendFileSync(getLogFilePath(), `${line}\n`, 'utf8');
          console.log(line);
        }

        function normalizeError(error) {
          if (!error) {
            return undefined;
          }

          return {
            message: error.message,
            stack: error.stack,
            name: error.name,
          };
        }

        module.exports = {
          info(message, metadata) {
            write('INFO', message, metadata);
          },
          warn(message, metadata) {
            write('WARN', message, metadata);
          },
          error(message, error) {
            write('ERROR', message, normalizeError(error));
          },
          getRecentLogs(limit = 100) {
            try {
              const content = fs.readFileSync(getLogFilePath(), 'utf8');
              return content.trim().split('\n').filter(Boolean).slice(-limit);
            } catch (_error) {
              return [];
            }
          },
          getLogFilePath,
        };
