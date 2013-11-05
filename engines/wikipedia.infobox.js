var qs = require('querystring');
var q = require('q');
var cheerio = require('cheerio');
var nconf = require('nconf');
var request = require('request');
nconf.argv().env().file({ file: 'local.json' });

var wikipediaInfoCardTable = "<table class='infobox vcard' cellspacing='3' style='border-spacing:3px;width:22em;width:26em;'>";

module.exports = new (require('../Engine'))({
    "id": "wikipedia.infobox",
    "name": "Wikipedia Infobox",
    "site": "http://en.wikipedia.org/wiki/",
    "queryFunc": function (term) {
        var d = q.defer();

        console.log('wikipedia infobox queryFunc: ' + term);

        var url = 'http://en.wikipedia.org/wiki/' + qs.escape(term);

        request.get({
            url: url
        }, function (err, data, body) {
            if (err) {
                d.reject(err);
            } else {
                var respBody = cheerio.load(body);

                //TODO check for disambiguation page or error page

                var foo = respBody('table.infobox').html();
                foo = wikipediaInfoCardTable + foo + "</table>";

                d.resolve(foo);
            }
        });

        return d.promise;


    },
    "suggestUrl": "",
    "icon": ""
});
