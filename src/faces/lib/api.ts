import { LoggerInterface } from '../utils/logger';

export default interface ApiConfigInterface {
  url?: string;
  host?: string;
  protocol?: string;
  port?: string | number;
  timeout?: number;
  log?: boolean;
  logger?: LoggerInterface;
}
