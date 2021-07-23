var crypto = require('crypto').webcrypto;
const {defaults} = require('jest-config');

global.crypto = crypto;

module.exports = {
  preset: 'ts-jest',
  testMatch: ["**/__tests__/**/*.[jt]s?(x)"],
  globals: {
    ...defaults.globals,
    crypto
  },
  verbose: true,
};