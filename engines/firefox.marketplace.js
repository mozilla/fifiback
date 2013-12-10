var qs = require('querystring');
var q = require('q');
var nconf = require('nconf');
var request = require('request');
nconf.argv().env().file({ file: 'local.json' });

module.exports = new (require('../Engine'))({
    "id": "firefox.marketplace",
    "name": "Firefox Marketplace",
    "site": "https://marketplace.firefox.com/api/v1/apps/search",
    "queryFunc": function (term) {
        var d = q.defer();

        console.log('firefox marketplace queryFunc: ' + term);

        var url = "https://marketplace.firefox.com/api/v1/apps/search/?lang=en-US&q="+qs.escape(term)+"&region=us";

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
