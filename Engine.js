'use strict';

var q = require('q');
var url = require('url');

var nconf = require('nconf');
nconf.argv().env().file({ file: 'local.json' });

var protocols = {
  'http:': require('http'),
  'https:': require('https')
};

function keySize(obj) {
  var size = 0;
  var key;

  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      size ++;
    }
  }
  return size;
};

function request(protocol, url) {
  var req;
  var result = '';
  var d = q.defer();

  req = protocol.request(url, function (res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      result += chunk;
    });
    res.on('end', function () {
      if (res.statusCode === 301 || res.statusCode === 302) {
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
  }).on('error', function (e) {
    d.reject(e);
  });

  req.setHeader('User-Agent', 'Fifi/0.1');
  req.setHeader('Referer', nconf.get('httpReferer'));
  req.end();

  return d.promise;
}

function makeStandardRequest(protocol, urlRaw) {
  return function req(term, location, geolocation, engineId) {
    var url = urlRaw.replace('{searchTerms}', encodeURIComponent(term));
        url = url.replace('{geo:name}', encodeURIComponent(location));

    return request(protocol, url);
  };
}

function makeApi(apiName, req) {
  return function (term, location, geolocation) {
    var engineId = this.id;

    console.log('CALLING SERVICE: ' + apiName + ': ' + engineId + ':' + term + ':' + location);

    return req(term, location, geolocation, engineId).then(function (result) {
      return result;
    });
  };
}


function Engine(opts) {
  // First just transfer all options to this instance.
  Object.keys(opts).forEach(function (key) {
    this[key] = opts[key];
  }.bind(this));

  // Convert URL arg strings to smarter objects
  if (this.suggestUrl) {
    this.suggestObj = url.parse(this.suggestUrl);
    this.suggestFunc = makeStandardRequest(protocols[this.suggestObj.protocol],
                                           this.suggestUrl);
  }

  if (this.queryUrl) {
    this.queryObj = url.parse(this.queryUrl);
    this.queryFunc = makeStandardRequest(protocols[this.queryObj.protocol],
                                         this.queryUrl,
                                         this.id,
                                         this.location,
                                         this.geolocation);
  }

  // Create API methods
  this.suggest = makeApi('suggest', this.suggestFunc);
  this.query = makeApi('query', this.queryFunc);
}

module.exports = Engine;
