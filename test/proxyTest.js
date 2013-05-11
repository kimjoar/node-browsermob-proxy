var sinon = require('sinon'),
    nock = require('nock'),
    assert = require('chai').assert,
    browsermob = require('../');

module.exports = {
    '#start': {
        'creates new proxy': function(done) {
            var proxy = browsermob();

            var startRequest = nock('http://localhost:8080')
                .post('/proxy')
                .reply(200, { "port": 9092 });

            proxy.start(function() {});

            setTimeout(function() {
                startRequest.done();
                done();
            }, 0);
        },

        'triggers callback': function(done) {
            var proxy = browsermob();

            var startRequest = nock('http://localhost:8080')
                .post('/proxy')
                .reply(200, { "port": 9092 });

            var spy = sinon.spy();
            proxy.start(spy);

            setTimeout(function() {
                assert(spy.calledOnce);
                done();
            }, 0);
        },

        'triggers callback with port': function(done) {
            var proxy = browsermob();

            var startRequest = nock('http://localhost:8080')
                .post('/proxy')
                .reply(200, { "port": 9092 });

            var spy = sinon.spy();
            proxy.start(spy);

            setTimeout(function() {
                assert(spy.calledWith(null, { port: 9092 }));
                done();
            }, 0);
        }
    },

    '#stop': {
        'shuts down the proxy': function(done) {
            var proxy = browsermob();

            var startRequest = nock('http://localhost:8080')
                .delete('/proxy/9092')
                .reply(200);

            proxy.stop(9092, function() {});

            setTimeout(function() {
                startRequest.done();
                done();
            }, 0);
        },

        'triggers callback': function(done) {
            var proxy = browsermob();

            var startRequest = nock('http://localhost:8080')
                .delete('/proxy/9092')
                .reply(200);

            var spy = sinon.spy();
            proxy.stop(9092, spy);

            setTimeout(function() {
                assert(spy.calledOnce);
                done();
            }, 0);
        }
    },

    '#startHAR': {
        'creates a new HAR': function(done) {
            var proxy = browsermob();

            var startRequest = nock('http://localhost:8080')
                .put('/proxy/9092/har')
                .reply(204);

            proxy.startHAR(9092, function() {});

            setTimeout(function() {
                startRequest.done();
                done();
            }, 0);
        },

        'triggers callback': function(done) {
            var proxy = browsermob();

            var startRequest = nock('http://localhost:8080')
                .put('/proxy/9092/har')
                .reply(204);

            var spy = sinon.spy();
            proxy.startHAR(9092, spy);

            setTimeout(function() {
                assert(spy.calledOnce);
                done();
            }, 0);
        }
    },

    '#getHAR': {
        'fetches HAR content': function(done) {
            var proxy = browsermob();
            var har = { key: 'value' };

            var startRequest = nock('http://localhost:8080')
                .get('/proxy/9092/har')
                .reply(200, har);

            proxy.getHAR(9092, function() {});

            setTimeout(function() {
                startRequest.done();
                done();
            }, 0);
        },

        'triggers callback': function(done) {
            var proxy = browsermob();
            var har = { key: 'value' };

            var startRequest = nock('http://localhost:8080')
                .get('/proxy/9092/har')
                .reply(200, har);

            var spy = sinon.spy();
            proxy.getHAR(9092, spy);

            setTimeout(function() {
                assert(spy.calledOnce);
                done();
            }, 0);
        },

        'triggers callback with received HAR': function(done) {
            var proxy = browsermob();
            var har = { key: 'value' };

            var startRequest = nock('http://localhost:8080')
                .get('/proxy/9092/har')
                .reply(200, har);

            var spy = sinon.spy();
            proxy.getHAR(9092, spy);

            setTimeout(function() {
                assert(spy.calledWith(null, har));
                done();
            }, 0);
        }
    },
};
