'use strict';

const Code = require('@hapi/code');

const Lab = require('@hapi/lab');

const Doggo = require('../lib');
const DoggoAdapterTestSuite = require('./adapter-test-suite');
const MockAdapter = require('./mock-adapter');
const Package = require('../package.json');

const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;

const TEST_UTILS = {
    expect,
    describe,
    it
};

const getBadAdapter = () => {

    const mock = { ...MockAdapter };
    delete mock.encrypt;

    return mock;
};

describe('Doggo', () => {

    it('Returns a Doggo object for valid adapter', () => {

        expect(Doggo(MockAdapter)).to.include(['api', 'version']);
    });

    it('Throws on invalid adapter schema', () => {

        expect(() => Doggo(getBadAdapter())).to.throw(/encrypt/);
    });

    it('Throws on no args passed (adapter is required)', () => {

        expect(() => Doggo()).to.throw();
    });

    it('Provides correct package version', () => {

        expect(Doggo(MockAdapter).version).to.equal(Package.version);
    });
});

describe('DoggoAdapterTestSuite', () => {

    it('Assigns instance props based on valid constructor args', () => {

        expect(new DoggoAdapterTestSuite(MockAdapter, TEST_UTILS)).to.exist();

        const testSuite = new DoggoAdapterTestSuite(MockAdapter, TEST_UTILS);

        expect(testSuite.adapter).to.equal(MockAdapter);
        expect(testSuite.doggo).to.include(['api', 'version']);
        expect(testSuite.testUtils).to.equal(TEST_UTILS);
    });

    it('Throws on no options passed', () => {

        expect(() => new DoggoAdapterTestSuite()).to.throw(/Invalid adapter passed/);
    });

    it('Throws on invalid adapter', () => {

        expect(() => new DoggoAdapterTestSuite(getBadAdapter(), TEST_UTILS)).to.throw(/encrypt/);
    });

    it('Throws on invalid testUtils', () => {

        expect(() => new DoggoAdapterTestSuite(MockAdapter, {})).to.throw(/Invalid testUtils passed/);
    });
});

/*
    =========================================
    Run DoggoAdapterTestSuite on MockAdapter
    =========================================
*/
new DoggoAdapterTestSuite(MockAdapter, TEST_UTILS).run();
