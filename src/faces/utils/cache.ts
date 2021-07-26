export interface CacheInterface {
  size: number;
  memSize: number;
  put: (key: string, value: any, ttl?: number) => void;
  get: (key: string) => any;
  del: (key: string) => void;
  clear: () => void;
  hasExpired: (key: string) => boolean;
}
