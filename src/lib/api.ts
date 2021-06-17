import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import ApiConfigInterface from '../faces/api';

export default class Api {
  private trustedHosts = [
    'https://arweave.net',
    'https://gateway.amplify.host',
    'https://gateway-n1.amplify.host',
    'https://gateway-n2.amplify.host',
    'https://gateway-n3.amplify.host',
  ];

  private _config!: ApiConfigInterface;

  public get config(): ApiConfigInterface {
    return this._config;
  }

  constructor(config: ApiConfigInterface = {}, trustedHosts?: string[]) {
    this._config = this.mergeDefaults(config);
    this.trustedHosts = trustedHosts || this.trustedHosts;
  }

  public async get(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.doRequest(endpoint, config, 'get');
  }

  public async post(
    endpoint: string,
    body: Buffer | string | object,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    return this.doRequest(endpoint, config, 'post', body);
  }

  private async doRequest(
    endpoint: string,
    config: AxiosRequestConfig,
    type: 'get' | 'post',
    body?: Buffer | string | object,
  ): Promise<AxiosResponse> {
    const previous = this.config;
    const tmpTrusted: string[] = [this.config.url, ...this.trustedHosts];
    const total = tmpTrusted.length;
    let current = 0;

    const run = async () => {
      try {
        this._config = this.mergeDefaults({ url: tmpTrusted.splice(0, 1)[0] });

        endpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

        if (type === 'get') {
          return await this.request().get(endpoint, config);
        }
        return await this.request().post(endpoint, body, config);
      } catch (error) {
        current++;
        if (current < total && previous.host !== 'localhost') {
          return run();
        }

        this._config = previous;
        if (error.response && error.response.status) {
          return error.response;
        }

        throw error;
      }
    };

    return run();
  }

  public request(): AxiosInstance {
    const instance = axios.create({
      baseURL: `${this.config.url}`,
      timeout: this.config.timeout,
      maxContentLength: 1024 * 1024 * 512,
    });

    if (this.config.log) {
      instance.interceptors.request.use((request) => {
        this.config.logger!.log(`Requesting: ${request.baseURL}/${request.url}`);
        return request;
      });

      instance.interceptors.response.use((response) => {
        this.config.logger!.log(`Response:   ${response.config.url} - ${response.status}`);
        return response;
      });
    }

    return instance;
  }

  private mergeDefaults(config: ApiConfigInterface) {
    if (config.url) {
      const match = config.url.match(/(https?):\/\/([\w\.]+):?(\d+)?/);
      if (match) {
        config.protocol = match[1];
        config.host = match[2];
        config.port = +match[3] || (config.protocol === 'https' ? 443 : 80);
        config.url = config.url.replace(':80', '').replace(':443', '');
      } else {
        config.url = 'https://arweave.net';
        return this.mergeDefaults(config);
      }
    } else if (config.host && config.protocol) {
      config.port = config.port || (config.protocol === 'https' ? 443 : 80);
      const port = config.port === 80 || config.port === 443 ? '' : `:${config.port}`;
      config.url = `${config.protocol}://${config.host}${port}`;
    } else if (config.host && config.port) {
      config.url = `${config.port === 443 ? 'https' : 'http'}://${config.host}:${config.port}`;
      return this.mergeDefaults(config);
    } else {
      config.url = 'https://arweave.net';
      return this.mergeDefaults(config);
    }

    config.timeout = config.timeout || 20000;
    config.log = config.log || false;
    config.logger = config.logger || console;

    return config;
  }
}
