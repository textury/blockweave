# arweave-js
JavaScript/TypeScript SDK for interacting with the Arweave network

**API differences with ArweaveJS from the core team:**
- `Arweave.init()` has been replaced to `new Arweave()`.
- `init()` can be initialized without params.
- `init()` has a new option called `url` which allows us to do `Arweave.init({url: 'https://arweave.net'})` instead of using `protocol`, `host`, `port` separately.
- `init()` allows to set `host and protocol` or `host and port` without the other params.
- If the `Arweave` instance isn't able to reach the config gateway, it will move around trusted gateways until it finds a live one, only if it's not `localhost` as `host`.
- `api.getConfig()` has been replaced to `api.config`.
- `config.logger` was expecting the `.log` function of loggers, this has been replace to receive the entire object (ex: `config.logger = console`).