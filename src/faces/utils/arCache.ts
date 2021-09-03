export interface ArCacheInterface {
  size: number;
  memSize: number;
  set: (key: string, value: any, ttl?: number) => void;
  get: (key: string) => any;
  del: (key: string) => void;
  clear: () => void;
  hasExpired: (key: string) => boolean;
}
