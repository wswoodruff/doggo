'use strict';

const Code = require('@hapi/code');

const Lab = require('@hapi/lab');

const Doggo = require('../lib');
const AdapterTestSuite = require('./adapter-test-suite');
const MockAdapter = require('./mock-adapter');
const Package = require('../package.json');

// Test shortcuts
const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;

const TEST_UTILS = {
    expect,
    describe,
    it
};

const getBadAdapter = () => {

    const badMock = { ...MockAdapter };
    delete badMock.encrypt;

    return badMock;
};

describe('Doggo', () => {

    it('Returns an { api, version } object for valid adapter', () => {

        const doggo = Doggo(MockAdapter);

        expect(doggo).to.include(['api', 'version']);
    });

    it('Throws on invalid adapter schema', () => {

        expect(() => Doggo(getBadAdapter())).to.throw(/encrypt/);
    });

    it('Throws on no args passed (adapter is required)', () => {

        expect(() => Doggo()).to.throw(/Invalid adapter passed/);
    });

    it('Defaults a genPassword func if none is provided', () => {

        const adapterNoGenPw = { ...MockAdapter };
        delete adapterNoGenPw.genPassword;

        const doggo = Doggo(adapterNoGenPw);

        expect(doggo.api).to.include('genPassword');

        expect(doggo.api.genPassword()).to.exist();
    });

    it('Shows package.json\'s version', () => {

        expect(Doggo(MockAdapter).version).to.equal(Package.version);
    });
});

describe('AdapterTestSuite', () => {

    it('Assigns instance props based on valid constructor args', () => {

        expect(new AdapterTestSuite(MockAdapter, TEST_UTILS)).to.exist();

        const testSuite = new AdapterTestSuite(MockAdapter, TEST_UTILS);

        expect(testSuite.adapter).to.equal(MockAdapter);
        expect(testSuite.doggo).to.include(['api', 'version']);
        expect(testSuite.testUtils).to.equal(TEST_UTILS);
    });

    it('Throws on no options passed', () => {

        expect(() => new AdapterTestSuite()).to.throw(/Invalid adapter passed/);
    });

    it('Throws on bad adapter', () => {

        expect(() => new AdapterTestSuite(getBadAdapter(), TEST_UTILS)).to.throw(/encrypt/);
    });

    it('Throws on bad testUtils', () => {

        expect(() => new AdapterTestSuite(MockAdapter, {})).to.throw(/Invalid testUtils passed/);
    });

    /*
        Generate and run test suite on MockAdapter
    */

    const adapterTestSuite = new AdapterTestSuite(MockAdapter, TEST_UTILS);
    adapterTestSuite.genAndRunTests();
});
