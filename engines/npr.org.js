var qs = require('querystring');
var q = require('q');
var nconf = require('nconf');
var request = require('request');
nconf.argv().env().file({ file: 'local.json' });
var apikey = nconf.get("nprAPIKey");
//http://api.npr.org/query?searchTerm=######&searchType=mainText&numResults=10&output=JSON&apiKey=#####

module.exports = new (require('../Engine'))({
    "id": "npr.org",
    "name": "npr.org",
    "site": "http://api.npr.org",
    "queryFunc": function (term) {
        var d = q.defer();

        console.log('npr queryFunc: ' + term);

        var url = 'http://api.npr.org/query?searchTerm=' + qs.escape(term) + '&searchType=mainText&numResults=5&output=JSON&apiKey=' + apikey;

        request.get({
            url: url
        }, function (err, data, body) {
            if (err) {
                d.reject(err);
            } else {
                d.resolve(body);
            }
        });

        return d.promise;


    },
    "suggestUrl": "",
    "icon": ""
});
