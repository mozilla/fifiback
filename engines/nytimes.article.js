var qs = require('querystring');
var q = require('q');
var nconf = require('nconf');
var request = require('request');
nconf.argv().env().file({ file: 'local.json' });
var apikey = nconf.get("newYorkTimesArticleSearchAPIKey");
//http://api.nytimes.com/svc/search/v2/articlesearch.response-format?[q=search term&fq=filter-field:(filter-term)&additional-params=values]&api-key=####

module.exports = new (require('../Engine'))({
    "id": "nytimes.article",
    "name": "nytimes article search",
    "site": "http://api.nytimes.com/svc/search/v2/articlesearch",
    "queryFunc": function (term) {
        var d = q.defer();

        console.log('wikipedia infobox queryFunc: ' + term);

        var url = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q=' + qs.escape(term) + '&api-key=' + apikey;

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
