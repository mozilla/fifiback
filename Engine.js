/*jshint node: true */
var q = require('q'),
    url = require('url'),
    protocols = {
      'http:': require('http'),
      'https:': require('https')
    };

function makeApi(protocol, urlParts) {
  return function (term) {
    var d = q.defer(),
        result = '',
        url = urlParts[0] +
              encodeURIComponent(term) +
              urlParts[1];

    protocols[protocol].get(url, function(res) {
      res.setEncoding('utf8');
      res.on("data", function(chunk) {
        result += chunk;
      });
      res.on("end", function() {
        d.resolve(result);
      });
    }).on('error', function(e) {
      d.reject(e);
    });

    return d.promise;
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
  this.suggestParts = this.suggest.split('{searchTerms}');
  this.queryParts = this.query.split('{searchTerms}');

  // Create API methods
  this.suggest = makeApi(protocols[this.suggestObj.protocol], this.suggestParts);
  this.query = makeApi(protocols[this.queryObj.protocol], this.queryParts);
}

module.exports = Engine;