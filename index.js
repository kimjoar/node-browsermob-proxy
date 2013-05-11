var webdriverjs = require('webdriverjs'),
    request = require('request'),
    url = require('url');

// HTTP Archive (HAR)
// The HAR specification:
// http://www.softwareishard.com/blog/har-12-spec/

module.exports = function(opts) {
    opts = opts || {};

    var host = opts.host || 'localhost';
    var port = opts.port || 8080;
    var seleniumHost = opts.seleniumHost || 'localhost';
    var seleniumPort = opts.seleniumPort || 4444;
    var browserName = opts.browser || 'firefox';
    var logLevel = opts.logLevel || 'verbose';

    var goTo = function(proxy, url, options, callback) {
        // check if selenium is running?

        options = options || {};

        var params = {
            host: options.seleniumHost || seleniumHost,
            port: options.seleniumPort || seleniumPort,
            desiredCapabilities: {
                browserName: options.browser || browserName,
                seleniumProtocol: 'WebDriver',
                proxy: { httpProxy: proxy }
            },
            logLevel: options.logLevel || logLevel
        }
        var browser = webdriverjs.remote(params);

        browser
            .init()
            .url(url)
            .end(callback);
    };

    // url, options, trafficCallback, harCallback
    // url, options, harCallback
    // url, trafficCallback, harCallback
    // url, harCallback
    var generateHAR = function(url, options, trafficCallback, harCallback) {
        // check if browsermob is running

        if (typeof harCallback === 'function') {
            // url, options, trafficCallback, harCallback
        } else {
            if (typeof options === 'function' && typeof trafficCallback === 'function') {
                // url, trafficCallback, harCallback
                harCallback = trafficCallback;
                trafficCallback = options;
                options = {};
            } else if (typeof options !== 'function' && typeof trafficCallback === 'function') {
                // url, options, harCallback
                harCallback = trafficCallback;
                trafficCallback = goTo;
            } else if (typeof options === 'function') {
                // url, harCallback
                harCallback = options;
                trafficCallback = goTo;
                options = {};
            } else {
                throw new Error('illegal arguments');
            }
        }

        doGenerateHAR(url, options, trafficCallback, harCallback);
    };

    var doGenerateHAR = function(url, options, trafficCallback, harCallback) {
        start(function(err, data) {
            if (err) return harCallback(err);

            startHAR(data.port, function(err) {
                if (err) {
                    return stop(function() {
                        harCallback(err);
                    });
                }

                trafficCallback(host + ':' + data.port, url, options, function() {

                    getHAR(data.port, function(err, resp) {
                        if (err) return harCallback(err);

                        stop(data.port, function(err) {
                            if (err) return harCallback(err);

                            harCallback(null, resp);
                        });
                    });
                });
            });
        });
    };

    var urlFormat = function(path) {
        var url = 'http://' + host + ':' + port + path;
        return url;
    };

    var req = function(method, url, queryParams, callback) {
        if (typeof callback === 'undefined' && typeof queryParams === 'function') {
            callback = queryParams;
            queryParams = {};
        }
        var obj = {
            method: method,
            url: urlFormat(url),
            qs: queryParams
        }
        request(obj, callback);
    };

    // Create a proxy
    var start = function(callback) {
        req('POST', '/proxy', function(err, response, body) {
            if (err) return callback(err);
            callback(null, JSON.parse(body));
        });
    };

    // Shut down the proxy and close the port
    var stop = function(port, callback) {
        req('DELETE', '/proxy/' + port, function(err, response, body) {
            callback();
        });
    };

    // Create a new HAR attached to the proxy
    var startHAR = function(port, callback) {
        req('PUT', '/proxy/' + port + '/har', function(err, response, body) {
            callback();
        });
    };

    // get HAR content for proxy
    var getHAR = function(port, callback) {
        req('GET', '/proxy/' + port + '/har', function(err, response, body) {
            callback(null, JSON.parse(body));
        });
    };

    return {
        generateHAR: generateHAR,
        start: start,
        stop: stop,
        startHAR: startHAR,
        getHAR: getHAR
    };
};
