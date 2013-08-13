var q = require('q');

module.exports = new (require('../Engine'))({
  "id": "yelp.com",
  "name": "Yelp",
  "site": "http://www.yelp.com/opensearch",
  "queryUrl": "http://www.yelp.com/search?find_desc={searchTerms}&src=firefox&find_loc={geo:name}",
  "suggestUrl": "http://www.yelp.com/search_suggest/json?prefix={searchTerms}&src=firefox&loc={geo:name}",
  "suggestTranslate" : function (term, request) {
    var d = q.defer();
    request.then(function (result) {
			d.resolve([ term, result['suggestions'] ]);
    }, d.reject);
    return d.promise;
  },
  "icon": "http://media2.ak.yelpcdn.com/static/201012161623981098/img/ico/favicon.ico"
});