var qs = require('querystring');
var q = require('q');
var nconf = require('nconf');
var request = require('request');
nconf.argv().env().file({ file: 'local.json' });
var apikey = nconf.get("guardianAPIKey");
http://content.guardianapis.com/search?q=syria&api-key=######

module.exports = new (require('../Engine'))({
    "id": "guardian.com",
    "name": "guardian.com",
    "site": "http://content.guardianapis.com",
    "queryFunc": function (term) {
        var d = q.defer();

        console.log('guardian queryFunc: ' + term);

        var url = 'http://content.guardianapis.com/search?q=' + qs.escape(term) + '&api-key=' + apikey;

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
