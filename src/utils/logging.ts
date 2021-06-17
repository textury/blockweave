import ApiConfigInterface from '../faces/api';
import { LoggerInterface } from '../faces/utils/logger';

export default class Logging {
  logger: LoggerInterface;
  _log: boolean = false;

  constructor(config: ApiConfigInterface) {
    this._log = config.log;
    this.logger = config.logger || console;
  }

  public log(...args: any[]): void {
    this.show('log', ...args);
  }

  public info(...args: any[]): void {
    this.show('info', ...args);
  }

  public warn(...args: any[]): void {
    this.show('warn', ...args);
  }

  public error(...args: any[]): void {
    this.show('error', ...args);
  }

  private show(type: 'log' | 'info' | 'warn' | 'error', ...args: any[]) {
    if (this._log) {
      this.logger[type](...args);
    }
  }
}
