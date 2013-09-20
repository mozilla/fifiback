var q = require('q');
var nconf = require('nconf');
nconf.argv().env().file({ file: 'local.json' });

var config = {
  'secrets' : {
    'clientId' : nconf.get('foursquareClientId'),
    'clientSecret' : nconf.get('foursquareClientSecret'),
    'redirectUrl' : nconf.get('foursquareRedirectUrl')
  }
};
var foursquare = require('node-foursquare')(config);

module.exports = new (require('../Engine'))({
  "id": "foursquare.com",
  "name": "FourSquare",
  "site": "http://www.foursquare.com/",
  "suggestUrl": "http://www.yelp.com/search_suggest/json?prefix={searchTerms}&src=firefox&loc={geo:name}",
  "queryFunc": function (term, location, geolocation) {
    console.log("FQ QUERY", term, location, geolocation);
    var d = q.defer();
    console.log("geolocation", geolocation);
    var lat = geolocation.split(',')[0];
    var lng = geolocation.split(',')[1];
    foursquare.Venues.explore(
      lat,
      lng,
      { query : term, limit : 5, near : location, venuePhotos : 1, radius : 4000 },
      null, // accessToken
      function callback (err, results) {
        console.log("FourSquare", err, results);
        if(err) { d.reject(err); }
        else {
          d.resolve(results);
        }
      }
    );
    return d.promise;
  },
  "icon": "https://playfoursquare.s3.amazonaws.com/press/logo/icon-16x16.png"
});
