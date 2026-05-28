/*!
 * Copyright (c) 2021-2026 Digital Bazaar, Inc.
 */
import chai from 'chai';
chai.should();
const {expect} = chai;

import {CachedResolver} from '../lib/CachedResolver.js';

// Minimal mock DID driver
function mockDriver({method = 'ex', doc = {id: 'did:ex:123'}} = {}) {
  return {
    method,
    get: async ({did} = {}) => ({...doc, id: did ?? doc.id}),
    generate: async () => ({doc, keys: {}})
  };
}

describe('CachedResolver', () => {
  describe('constructor cache options', () => {
    it('should use a default ttl of 5000ms when no options are given',
      async () => {
        const resolver = new CachedResolver();
        // The underlying LruCache ttl option should be 5000
        expect(resolver._cache.options.ttl).to.equal(5000);
      });

    it('should accept the v4-style `ttl` option', async () => {
      const resolver = new CachedResolver({ttl: 3000});
      expect(resolver._cache.options.ttl).to.equal(3000);
    });

    it('should accept the v3-style `maxAge` option and translate it to `ttl`',
      async () => {
        const resolver = new CachedResolver({maxAge: 3000});
        expect(resolver._cache.options.ttl).to.equal(3000);
      });

    it('should prefer `ttl` over `maxAge` when both are provided', async () => {
      const resolver = new CachedResolver({ttl: 4000, maxAge: 1000});
      expect(resolver._cache.options.ttl).to.equal(4000);
    });

    it('should accept the `max` option', async () => {
      const resolver = new CachedResolver({max: 50});
      expect(resolver._cache.options.max).to.equal(50);
    });

    it('should use a custom cache instance when `cache` option is provided',
      async () => {
        const customCache = {
          memoize: async ({fn}) => fn()
        };
        const resolver = new CachedResolver({cache: customCache});
        expect(resolver._cache).to.equal(customCache);
      });
  });

  describe('use()', () => {
    it('should register a driver by its method name', async () => {
      const resolver = new CachedResolver();
      const driver = mockDriver({method: 'ex'});
      resolver.use(driver);
      expect(resolver._methods.get('ex')).to.equal(driver);
    });
  });

  describe('get()', () => {
    it('should resolve a DID document using a registered driver', async () => {
      const resolver = new CachedResolver();
      resolver.use(mockDriver({method: 'ex'}));

      const doc = await resolver.get({did: 'did:ex:123'});
      expect(doc).to.have.property('id', 'did:ex:123');
    });

    it('should accept `url` as an alias for `did`', async () => {
      const resolver = new CachedResolver();
      resolver.use(mockDriver({method: 'ex'}));

      const doc = await resolver.get({url: 'did:ex:123'});
      expect(doc).to.have.property('id', 'did:ex:123');
    });

    it('should return a cached result on the second call', async () => {
      let callCount = 0;
      const driver = {
        method: 'ex',
        get: async ({did}) => {
          callCount++;
          return {id: did};
        }
      };

      const resolver = new CachedResolver({ttl: 60000});
      resolver.use(driver);

      await resolver.get({did: 'did:ex:123'});
      await resolver.get({did: 'did:ex:123'});
      expect(callCount).to.equal(1);
    });

    it('should throw if neither `did` nor `url` is given', async () => {
      const resolver = new CachedResolver();
      let err;
      try {
        await resolver.get({});
      } catch(e) {
        err = e;
      }
      expect(err).to.be.instanceof(TypeError);
      expect(err.message).to.include('"did" or "url"');
    });

    it('should throw if no driver is registered for the DID method',
      async () => {
        const resolver = new CachedResolver();
        let err;
        try {
          await resolver.get({did: 'did:unknown:123'});
        } catch(e) {
          err = e;
        }
        expect(err).to.be.instanceof(Error);
        expect(err.name).to.equal('MethodNotSupportedError');
        expect(err.message).to.include('unknown');
      });
  });

  describe('generate()', () => {
    it('should delegate to the registered driver', async () => {
      const resolver = new CachedResolver();
      resolver.use(mockDriver({method: 'ex'}));

      const result = await resolver.generate({method: 'ex'});
      expect(result).to.have.property('doc');
    });

    it('should throw if no driver is registered for the method', async () => {
      const resolver = new CachedResolver();
      let err;
      try {
        await resolver.generate({method: 'unknown'});
      } catch(e) {
        err = e;
      }
      expect(err).to.be.instanceof(Error);
      expect(err.name).to.equal('MethodNotSupportedError');
      expect(err.message).to.include('unknown');
    });
  });
});
