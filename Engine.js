/*jshint node: true */
var cache = require('./cache'),
    q = require('q'),
    url = require('url'),
    protocols = {
      'http:': require('http'),
      'https:': require('https')
    };

function request(protocol, url) {
  var req,
      result = '',
      d = q.defer();

  req = protocol.request(url, function(res) {
    res.setEncoding('utf8');
    res.on("data", function(chunk) {
      result += chunk;
    });
    res.on("end", function() {
      if (res.statusCode === 301 ||
          res.statusCode === 302) {
        //Redirect, try the new location
  console.log('REDIRECTING TO: ' + res.headers.location);
        request(protocol, res.headers.location).then(d.resolve, d.reject);
      } else {
        try {
          result = JSON.parse(result);
        } catch (e) {
          console.error('RESPONSE NOT JSON: ' + result);
        }
        d.resolve(result);
      }
    });
  }).on('error', function(e) {
    d.reject(e);
  });

  req.setHeader('User-Agent', 'Fifi/0.1');
  req.end();

  return d.promise;
}

function makeApi(apiName, protocol, urlParts) {
  return function (term) {
    var engineId = this.id,
        cacheKey = 'fifi-' + engineId + '-' + apiName + '-' + term,
        cacheProxy = this[apiName + 'Cache'],
        url = urlParts[0] +
              encodeURIComponent(term) +
              urlParts[1];

    // First check in local cache
    return cacheProxy.get(cacheKey).then(function (value) {
      // If a valid value, just return it.
      if (value) {
        console.log('USING CACHE: ' + apiName + ': ' + engineId + ':' + term);
        return value;
      }

      console.log('CALLING SERVICE: ' + apiName + ': ' + engineId + ':' + term);
      console.log(url);

      return request(protocol, url).then(function (result) {
        cacheProxy.set(cacheKey, result);
        return result;
      });
    });
  };
}


function Engine(opts) {
  // First just transfer all options to this instance.
  Object.keys(opts).forEach(function (key) {
    this[key] = opts[key];
  }.bind(this));

  // Convert URL arg strings to smarter objects
  this.suggestObj = url.parse(this.suggestUrl);
  this.queryObj = url.parse(this.queryUrl);

  // Then convert the query strings to allow for easy array join with search
  // terms.
  this.suggestParts = this.suggestUrl.split('{searchTerms}');
  this.queryParts = this.queryUrl.split('{searchTerms}');

  // Create API methods
  this.suggest = makeApi('suggest',
                         protocols[this.suggestObj.protocol],
                         this.suggestParts);
  this.query = makeApi('query',
                       protocols[this.queryObj.protocol],
                       this.queryParts);

  // Create cache proxies
  this.suggestCache = cache(this.suggestCacheMs);
  this.queryCache = cache(this.queryCacheMs);
}

Engine.prototype = {
  // These properties are on the prototype, so that they can be
  // overridden by constructor options for specific instances.

  suggestCacheMs: (4 /*hours*/ * 60 /*minutes*/ * 60 * 1000),
  queryCacheMs:   (1 /*hours*/ * 60 /*minutes*/ * 60 * 1000),
};

module.exports = Engine;