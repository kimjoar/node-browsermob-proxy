var webdriverjs = require('webdriverjs'),
    request = require('request')
    deferred = require('deferred');

// # Browsermob Proxy bindings for Node.js
//
// [Browsermob Proxy](http://bmp.lightbody.net/) can capture performance data
// for web apps (via the HAR format), as well as manipulate browser behavior
// and traffic, such as whitelisting and blacklisting content, simulating
// network traffic and latency, and rewriting HTTP requests and responses.
//
// [HAR (HTTP Archive)](https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/HAR/Overview.html)
// is an archival format for HTTP transactions that can be used by a web
// browser to export detailed performance data about web pages it loads.
//
// **Example**
//
//     var browsermobProxy = require('node-browsermob-proxy');
//     var proxy = browsermobProxy();
//     proxy.generateHAR('https://news.ycombinator.com/', function(err, data) {
//         console.log(data);
//     });
//
// You'll need both the Browsermob Proxy and
// [Selenium Webdriver](http://docs.seleniumhq.org/projects/webdriver/) to be
// up and running.
//
// This is by no means production-ready, and is primarily built because I wanted
// to learn more about Browsermob Proxy. It is heavily inspired by Mark Trostler's
// Node.js implementation, https://github.com/zzo/browsermob-node

module.exports = function(opts) {
    opts = opts || {};

    var host = opts.host || 'localhost';
    var port = opts.port || 8080;
    var seleniumHost = opts.seleniumHost || 'localhost';
    var seleniumPort = opts.seleniumPort || 4444;
    var browserName = opts.browser || 'firefox';
    var logLevel = opts.logLevel || 'verbose';

    // Create a proxy
    var start = function(callback) {
        return req('POST', '/proxy').then(function(resp) {
            var data = JSON.parse(resp.body);
            callback && callback(null, data);
            return data;
        });
    };

    // Shut down the proxy and close the port
    var stop = function(port, callback) {
        return req('DELETE', '/proxy/' + port).then(function() {
            callback && callback();
        });
    };

    // Create a new HAR attached to the proxy
    var startHAR = function(port, callback) {
        return req('PUT', '/proxy/' + port + '/har', function() {
            callback && callback();
        });
    };

    // get HAR content for proxy
    var getHAR = function(port, callback) {
        return req('GET', '/proxy/' + port + '/har').then(function(resp) {
            var data = JSON.parse(resp.body);
            callback && callback(null, data);
            return data;
        });
    };

    // Convenience function to generate HAR for a given URL in one go.
    //
    // There are two required parameters:
    //
    // - the `url` to capture HAR for
    // - the `harCallback` which is called when finished
    //
    // Optionally, you can specify:
    //
    // - `options` which are passed through to the browser traffic callback
    // - `trafficCallback` if you want to generate traffic beyond the simple
    //   built-in helper which uses Selenium Webdriver to open a browser at a
    //   given url
    //
    // The parameters can be specified in the following ways:
    //
    // - url, options, trafficCallback, harCallback
    // - url, options, harCallback
    // - url, trafficCallback, harCallback
    // - url, harCallback
    var generateHAR = function(url, options, trafficCallback, harCallback) {
        // check if browsermob is running?

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
        var port;

        start()
            .then(function(data) {
                port = data.port;
                return startHAR(port)
            })
            .then(function() {
                return trafficCallback(host + ':' + port, url, options);
            })
            .then(function() {
                return getHAR(port);
            })
            .then(function(resp) {
                return stop(port).then(function() {
                    harCallback(null, resp);
                });
            }, function(err) {
                return stop(port).then(function() {
                    harCallback(err);
                });
            });
    };

    var urlFormat = function(path) {
        return 'http://' + host + ':' + port + path;
    };

    var req = function(method, url, queryParams, callback) {
        var def = deferred();

        if (typeof callback === 'undefined' && typeof queryParams === 'function') {
            callback = queryParams;
            queryParams = {};
        }
        var obj = {
            method: method,
            url: urlFormat(url),
            qs: queryParams
        }
        request(obj, function(err, response, body) {
            callback && callback.apply(this, arguments);
            def.resolve({ response: response, body: body });
        });

        return def.promise;
    };

    var goTo = function(proxy, url, options, callback) {
        // check if selenium is running?

        var def = deferred();

        options = options || {};

        var browser = webdriverjs.remote({
            host: options.seleniumHost || seleniumHost,
            port: options.seleniumPort || seleniumPort,
            desiredCapabilities: {
                browserName: options.browser || browserName,
                seleniumProtocol: 'WebDriver',
                proxy: { proxyType: 'manual', httpProxy: proxy }
            },
            logLevel: options.logLevel || logLevel
        });

        browser
            .init()
            .url(url)
            .end(function() {
                callback && callback();
                def.resolve();
            });

        return def.promise;
    };

    return {
        start: start,
        stop: stop,
        startHAR: startHAR,
        getHAR: getHAR,
        generateHAR: generateHAR
    };
};
