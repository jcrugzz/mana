describe('mana', function () {
  'use strict';

  var Mana = require('../')
    , chai = require('chai')
    , expect = chai.expect
    , Token = Mana.Token;

  chai.config.includeStack = true;

  var mana = new Mana();

  describe('construction', function () {
    it('is exposed as function');
    it('calls the initialise function');
  });

  describe('.initialise', function () {
    it('correctly receives all arguments', function (done) {
      var Init = Mana.extend({
        initialise: function (foo, bar) {
          expect(foo).to.equal('bar');
          expect(bar).to.equal('foo');

          done();
        }
      });

      new Init('bar', 'foo');
    });
  });

  describe('#args', function () {
    it('aliases types', function () {
      expect(mana.args([function () {}])).to.have.property('fn');
      expect(mana.args([function () {}])).to.have.property('function');

      expect(mana.args([{}])).to.have.property('options');
      expect(mana.args([{}])).to.have.property('object');

      expect(mana.args(['foo'])).to.have.property('str');
      expect(mana.args(['foo'])).to.have.property('string');

      expect(mana.args([0])).to.have.property('nr');
      expect(mana.args([0])).to.have.property('number');

      expect(mana.args([[]])).to.have.property('array');
      expect(mana.args([new Date])).to.have.property('date');
    });

    it('parses multiple types correctly', function () {
      var types = mana.args([{}, 'str']);

      expect(types).to.have.property('string');
      expect(types).to.have.property('object');
    });
  });

  describe('#type', function () {
    it('detects array', function () {
      expect(mana.type([])).to.equal('array');
    });

    it('detects regexp', function () {
      expect(mana.type(/\//)).to.equal('regexp');
    });

    it('detects function', function () {
      expect(mana.type(function() {})).to.equal('function');
    });

    it('detects string', function () {
      expect(mana.type('string')).to.equal('string');
    });

    it('detects error', function () {
      expect(mana.type(new Error())).to.equal('error');
    });

    it('detects date', function () {
      expect(mana.type(new Date())).to.equal('date');
    });

    it('detects object', function () {
      expect(mana.type({})).to.equal('object');
    });
  });

  describe('tokenizer', function () {
    it('transforms all tokens to Token instances', function () {
      mana.tokens = ['foo', 'bar'];
      mana.tokenizer();

      expect(mana.tokens.length).to.equal(2);
      mana.tokens.forEach(function (token) {
        expect(token).to.be.instanceOf(Token);
        expect(/token (foo|bar)/i.test(token.authorization)).to.equal(true);
      });
    });

    it('allows multiple invocations', function () {
      mana.tokens = ['foo', 'bar'];
      mana.tokenizer().tokenizer().tokens.forEach(function (token) {
        expect(token).to.be.instanceOf(Token);
      });
    });

    it('accepts strings and Token instances', function () {
      mana.tokens = ['foo', new Token('banana'), 'bar'];
      mana.tokenizer().tokenizer().tokens.forEach(function (token) {
        expect(token).to.be.instanceOf(Token);
      });
    });
  });

  describe('#roll', function () {
    beforeEach(function () {
      mana.tokens = ['foo'];
      mana.tokenizer();
      mana.authorization = mana.tokens[0].authorization;

      mana.ratelimit = 9000;
      mana.remaining = 10;
      mana.ratereset = Date.now()/1000;
    });

    it('resets the current token to the current rate limit', function () {
      mana.roll();
      var token = mana.tokens[0];

      expect(token.ratelimit).to.equal(mana.ratelimit);
      expect(token.remaining).to.equal(mana.remaining);
      expect(token.ratereset).to.equal(mana.ratereset);
    });

    it('returns boolean values indicating a working token', function () {
      expect(mana.roll()).to.equal(true);

      mana.tokens[0].remaining = 0;
      mana.tokens[0].ratereset = (Date.now() / 1000) + 100;
      expect(mana.tokens.length).to.equal(1);
      expect(mana.tokens[0].available()).to.equal(false);

      expect(mana.roll()).to.equal(false);
    });

    it('returns the most optimal token', function () {
      mana.tokens = ['foo', 'bar', 'baz', 'oof', 'zab'];
      mana.tokenizer();
      mana.tokens.forEach(function (token) {
        token.ratelimit = 9000;
        token.remaining = 10;
        token.ratereset = Date.now()/1000;
      });

      var token = mana.tokens[2];
      mana.tokens[1].remaining = token.remaining = 1000;
      token.ratelimit = 10000;

      expect(mana.roll()).to.equal(true);
      expect(token.authorization).to.equal(mana.authorization);
    });
  });

  describe('#downgrade', function () {
    it('calls the function with the first item of the mirror');
    it('continues gets the next mirror on another invocation');
    it('gives an error when its out of mirrors');
  });
});

describe('Tokens', function () {
  'use strict';

  var Mana = require('../')
    , chai = require('chai')
    , expect = chai.expect
    , Token = Mana.Token;

  chai.config.includeStack = true;

  var token = new Token('foo')
    , mana = new Mana();

  it('sets all values to Infinity', function () {
    expect(token.ratelimit).to.equal(Infinity);
    expect(token.ratereset).to.equal(Infinity);
    expect(token.remaining).to.equal(Infinity);
  });

  it('transforms the given token to an correct Authorization header value', function () {
    expect(token.authorization).to.equal('token foo');
  });

  describe("#available", function () {
    beforeEach(function () {
      token.ratelimit = 0;
      token.ratereset = 0;
      token.remaining = 0;
    });

    it('is unavailable if values are null', function () {
      expect(token.available()).to.equal(false);
    });

    it('is available when fist initialised', function () {
      expect((new Token()).available()).to.equal(true);
    });

    it('is available if it has remaining rates', function () {
      expect(token.available()).to.equal(false);

      token.remaining = 1;
      expect(token.available()).to.equal(true);
    });

    it('is available if our rate has been reset', function () {
      expect(token.available()).to.equal(false);

      token.ratereset = Date.now() / 1000;
      expect(token.available()).to.equal(true);

      token.ratereset = (Date.now() / 1000) + 10;
      expect(token.available()).to.equal(false);
    });
  });
});
