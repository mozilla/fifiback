var q = require('q');
var nconf = require('nconf');
nconf.argv().env().file({ file: 'local.json' });

var yelp = require('yelp');
var yelpHelper = yelp.createClient({
  consumer_key: nconf.get('yelpKey'),
  consumer_secret: nconf.get('yelpSecret'),
  token: nconf.get('yelpToken'),
  token_secret: nconf.get('yelpTokenSecret')
});

module.exports = new (require('../Engine'))({
  "id": "yelp.com",
  "name": "Yelp",
  "site": "http://www.yelp.com/opensearch",
  "suggestUrl": "http://www.yelp.com/search_suggest/json?prefix={searchTerms}&src=firefox&loc={geo:name}",
  "suggestTranslate" : function (term, request) {
    var d = q.defer();
    request.then(function (result) {
			d.resolve([ term, result['suggestions'] ]);
    }, d.reject);
    return d.promise;
  },
  "queryFunc": function (term, location) {
    var d = q.defer();

    yelpHelper.search({
      term: term,
      location: location
    }, function (err, results) {
      if (err) {
        d.reject(err);
      } else {
        d.resolve(results);
      }
    });

    return d.promise;
  },
  "icon": "http://media2.ak.yelpcdn.com/static/201012161623981098/img/ico/favicon.ico"
});
