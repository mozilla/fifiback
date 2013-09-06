var q = require('q');
var nconf = require('nconf');
nconf.argv().env().file({ file: 'local.json' });

var twitter = require('twitter-oauth');
var twitterAuth = twitter({
  consumerKey: nconf.get('twitterKey'),
  domain: nconf.get('domain'),
  consumerSecret: nconf.get('twitterSecret'),
  loginCallback: '/twitter/sessions/callback',
  completeCallback:  '/'
});

module.exports = new (require('../Engine'))({
  "id": "twitter.com",
  "name": "Twitter",
  "site": "http://api.twitter.com",
  "queryFunc": function (term, location) {
    var d = q.defer();

    twitterAuth.search(term, nconf.get('twitterToken'), nconf.get('twitterTokenSecret'), function (err, results) {
      if (err) {
        d.reject(err);
      } else {
        d.resolve(results);
      }
    });

    return d.promise;
  },
  "icon": "https://twitter.com/favicon.ico"
});
