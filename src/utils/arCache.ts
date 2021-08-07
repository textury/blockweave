import { ArCacheInterface } from "../faces/utils/arCache";

/**
 * Implementation of a simple in-memory cache.
 */
export default class ArCache implements ArCacheInterface {
  private _cache: {
    [key: string]: {
      ttl: number;
      timestamp: number;
      value: any;
    };
  } = {};
  private _size = 0;
  private _maxMemSize: number = 2e6; // 2 MB by default
  private _itemsToDelete: number = 3;
  private _defaultTtl: number = 0;

  public get size() {
    return this._size;
  }
  public get memSize() {
    return this.roughSizeof(this._cache);
  }

  /**
   * @param {number=0} ttl - Time to live in seconds, Default 0 (never).
   * @param  {number=2e+6} maxMemSize - Maximum memory size in bytes, default is 2MB.
   * @param  {number=3} itemsToDelete - Number of items to delete when cache is full.
   */
  constructor(ttl: number = 0,maxMemSize: number = 2e6, itemsToDelete: number = 3) {
    this._maxMemSize = maxMemSize;
    this._itemsToDelete = itemsToDelete;
    this._defaultTtl = ttl;
  }

  /**
   * Add a new item to the cache.
   * @param  {string} key
   * @param  {any} value
   * @param {number} ttl - Time to live in seconds, 0 or null means never expires.
   * @returns {Promise<void>}
   */
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    if (this.memSize > this._maxMemSize) {
      this.makeRoom();
    }

    if (ttl === null || ttl === undefined) {
      ttl = this._defaultTtl;
    }

    this._cache[key] = {
      ttl: ttl? ttl * 1000 : 0,
      timestamp: Date.now(),
      value,
    };

    ++this._size;
  }
  /**
   * Get a specific item from the cache.
   * @param  {string} key 
   * @returns {any}
   */
  public async get(key: string): Promise<any> {
    const item = this._cache[key];
    if (item) {
      if(this.hasExpired(key)) {
        this.del(key);
        return undefined;
      }

      return item.value;
    }
    return undefined;
  }

  /**
   * Delete a specific item from the cache.
   * @param  {string} key
   */
  public del(key: string) {
    const item = this._cache[key];
    if (item) {
      delete this._cache[key];
      --this._size;
    }
  }

  /**
   * Clear the cache.
   */
  public clear() {
    this._cache = {};
    this._size = 0;
  }

  /**
   * Check wether an item has expired.
   * @param  {string} key
   * @returns boolean
   */
  public hasExpired(key: string): boolean {
    const item = this._cache[key];
    if (item) {
      return item.ttl && (item.ttl + item.timestamp) < Date.now();
    }
    return true;
  }

  /**
   * Delete old stored data from cache when the maxMemSize is reached to make room for new content.
   * @private
   */
  private makeRoom() {
    // Delete expired ttls
    for (const key in this._cache) {
      if (this._cache.hasOwnProperty(key)) {
        if(this.hasExpired(key)) {
          this.del(key);
        }
      }
    }

    // Check if we have to delete some more items
    if (this.memSize < this._maxMemSize) {
      return;
    }

    // Delete the oldest items
    const dates = Object.keys(this._cache).reduce((obj, key) => {
      obj[this._cache[key].timestamp] = key;
      return obj;
    }, {});

    const expirationDates = Object.keys(dates);
    for (let i = 0; i < this._itemsToDelete; i++) {
      const oldest = Math.min.apply(null, expirationDates);
      const key = dates[oldest];
      this.del(key);
    }
  }

  /**
   * Get the rough size of the cache.
   * @param {object} obj
   * @private
   */
  private roughSizeof(obj: object) {
    const objList = [];
    const stack = [obj];
    let bytes = 0;

    while (stack.length) {
      const value: any = stack.pop();

      if (typeof value === 'boolean') {
        bytes += 4;
      } else if (typeof value === 'string') {
        bytes += value.length * 2;
      } else if (typeof value === 'number') {
        bytes += 8;
      } else if (typeof value === 'object' && value !== null) {
        for (const i in value) {
          if (i) stack.push(value[i]);
        }
      } else if (typeof value === 'function') {
        bytes += 32;
      } else if (value === null) {
        bytes += 4;
      } else {
        bytes += 8;
      }
    }

    return bytes;
  }
}
