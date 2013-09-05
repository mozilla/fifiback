/*jshint node: true */
var q = require('q');
var cacheVersion = '4';
var redis;
var rtg;

if (process.env.REDISTOGO_URL) {
  // Remove this once we're fully on AWS
  rtg = require('url').parse(process.env.REDISTOGO_URL);
  redis = require('redis').createClient(rtg.port, rtg.hostname);
  redis.auth(rtg.auth.split(':')[1]);
} else {
  redis = require('redis').createClient();
}

module.exports = function (cacheLimit) {
  return {
    get: function (key) {
      var d = q.defer();
      redis.get(key, function (err, strValue) {
        // Convert to JSON and check if cache is valid
        var value = strValue && JSON.parse(strValue);
        if (!value ||
            err ||
            value.version !== cacheVersion ||
            value.stamp + cacheLimit < Date.now()) {
          // No longer valid
          d.resolve(null);
        } else {
          d.resolve(value.data);
        }
      });
      return d.promise;
    },
    set: function (key, obj) {
      var value = {
        version: cacheVersion,
        stamp: Date.now(),
        data: obj
      };
      redis.set(key, JSON.stringify(value));
    }
  };
};
