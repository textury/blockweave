# Key differences between `arweave` and `arsdk`
They are some differences on how to initialize and how it works for Arsdk from Textury (this one), and Arweave.js from the Arweave core team.

`arweave` is the Arweave core team library.
`arsdk` is the Textury library (this one).

## Code differences

### API differences with Arweave.js from the core team:
- `Arweave.init()` has been replaced to `new Arsdk()`.
- `init()` can be initialized without params.
- `init()` has a new option called `url` which allows us to do `Arsdk({url: 'https://arweave.net'})` instead of using `protocol`, `host`, `port` separately.
- `init()` allows to set `host and protocol` or `host and port` without the other params.
- If the `Arweave` instance isn't able to reach the config gateway, it will move around trusted gateways until it finds a live one, only if it's not `localhost` as `host`.
- `api.getConfig()` has been replaced to `api.config`.
- `config.logger` was expecting the `.log` function of loggers, this has been replace to receive the entire object (ex: `config.logger = console`).

### Transactions
- `arweave.transactions.sign()` and `arweave.transactions.post()` are now part of the `Transaction` class.
- You can now do `transaction.signAndPost()` instead of `transaction.sign()` and `transaction.post()` separately.
- `arweave.transactions.verify()` can now be done directly with the transaction: `transaction.verify()`.
- By default, Arsdk charges 10% fee on submitted transactions. This is fully optional and can be changed by sending `transaction.sign(feePercent = 0.1) // 10%` as a parameter.

## Caching mechanism comparison
`arweave` from the Arweave core team doesn't have a cache mechanism.
`arsdk` has a caching by default that works on both node and the browser, while still respecting the time it takes for things to update on the gateway and node. 

For example, the same `tx_anchor` is required on each transaction and can be used for 25 blocks. We request, cache, and then use it for the next transactions until ~20 blocks (time based), which prevents us from requesting the same `tx_anchor` over and over.

As you can see in this example, we do the same for `/price/{bytes}` calls. Each with their specific time based cache, always respecting how the blockweave works.

```bash
# arsdk
Requesting: https://arweave.net/tx_anchor
Response:   tx_anchor - 200
Requesting: https://arweave.net/price/13
Response:   price/13 - 200
Requesting: https://arweave.net/tx
Response:   tx - 200
Requesting: https://arweave.net/tx
Response:   tx - 200
Requesting: https://arweave.net/tx
Response:   tx - 200
Requesting: https://arweave.net/tx
Response:   tx - 200
Requesting: https://arweave.net/tx
Response:   tx - 200
```

```bash
# arweave
Requesting: https://arweave.net:443/tx_anchor
Response:   tx_anchor - 200
Requesting: https://arweave.net:443/price/13
Response:   price/13 - 200
Requesting: https://arweave.net:443/tx
Response:   tx - 200
Requesting: https://arweave.net:443/tx_anchor
Response:   tx_anchor - 200
Requesting: https://arweave.net:443/price/13
Response:   price/13 - 200
Requesting: https://arweave.net:443/tx
Response:   tx - 200
Requesting: https://arweave.net:443/tx_anchor
Response:   tx_anchor - 200
Requesting: https://arweave.net:443/price/13
Response:   price/13 - 200
Requesting: https://arweave.net:443/tx
Response:   tx - 200
```

This reduces the time it takes to do repetitive tasks. 

We did a benchmark using [kelonio](https://www.npmjs.com/package/kelonio) to measure the time it takes to send the same transaction for a 100 iterations.

The final results are a difference of **67% (974 ms)**. You can read more about it [here](benchmark.md).