var qs = require('querystring');
var q = require('q');
var nconf = require('nconf');
var request = require('request');
nconf.argv().env().file({ file: 'local.json' });

module.exports = new (require('../Engine'))({
  "id": "boxfish.com",
  "name": "Boxfish",
  "site": "https://api-staging.boxfish.com/v4/autocomplete",
  "queryFunc": function (term) {
    var d = q.defer();

    console.log('boxfish queryFunc: ' + term);


    var url = "https://api-staging.boxfish.com/v4/search/?query=" + qs.escape(term) 
              + "&lineup=" + qs.escape(nconf.get('boxfishSampleCableLineup'))
              + "&token=" + qs.escape(nconf.get('boxfishKey'))
              + "&category=news";

    request.get({
      url: url
    }, function (err, data, body) {
      if (err) {
        d.reject(err);
      } else {
        d.resolve(JSON.parse(body));
      }
    });

    return d.promise;


  },
  "suggestUrl": "https://api-staging.boxfish.com/v4/autocomplete/?fragment={searchTerms}"
        + "&lineup=" + qs.escape(nconf.get('boxfishSampleCableLineup'))
        + "&token=" + qs.escape(nconf.get('boxfishKey')),
  "icon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAsTAAALEwEAmpwYAAAB1klEQVQokWWQO2tUYRCG55xdk1hoIdFAlIAgRCwCghcMSNBCf4BYCgp20UbQLlWw28JOUIRgGVAsBG1ShFVYtVGxsbdRBINZ2T3fvBeLNTGQp3xn5plhqsudG02qSWS6AEgZAqgM0io0xJRQnLDQ/r0ZhRWyImyOC0QBitSIKaUFiQxUUhjRHmxWgJUteUwUSsVSYQimVay0kwItWrLZLv1aUAJWICNKkOYwkI5iUmY4LdFmmHXpq/Qj+62Ht26rbwyAPjGQhkaG0iwiJdgpl2jtPzrHJtjwxdq7b6+fCuq+/2QEE4KcFGnRo6ugOhujIVJZEBF3r1/9+fb54ckDSrmIoFMuMqSUoRpFSHIoZsYWn18++fJqRYBBgQKdCFBgzQZsEmhYFDuYmZ7683Vt8doVJSNhSqDJ1vjUcUH7Jia+91ZjF5cWzi7duWl7vdsL0VJr7OCsmD8+PNvdvc3C/Kmw19/0wq6defrEse3a/Qcre2fOTxw5Nz595tDshe186d6iZUu1srk4f3KUdnsflzuPjGLS5MavjT2Tc/8XmWG1lQhxlCx3HodkyWKYlsI7PiFFRDtE2/8UkgnbIVoIyzsGbEe4bSrkLQfMDNuGxbBiyzXyRegvJdvw8H4c2GsAAAAASUVORK5CYII="
});


