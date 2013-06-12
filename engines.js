/*jshint node: true */
var config,
    impls = {},
    path = require('path'),
    fs = require('fs'),
    q = require('q');

function makeApi(apiName) {
  return function (term, engineId) {
    var d,
        impl = impls[engineId];

    //Just ignore search engines we do not know
    if (!impl) {
      d = q.defer();
      d.resolve([]);
      return d.promise;
    } else {
      return impl[apiName](term);
    }
  };
}

var engines = {
  suggest: makeApi('suggest'),
  search: makeApi('search'),

  loadConfig: function () {
    var filePath = path.join(__dirname, 'config.json'),
        jsExtRegExp = /\.js$/;
console.log('CONFIG FILE IS: ' + filePath);

    this.config = config = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    fs.readdirSync(path.join(__dirname, 'engines'), function (fileName) {
      var id = fileName .replace(jsExtRegExp, '');
      impls[id] = require('./engines/' + id);
    });
  }

};

engines.loadConfig();
module.exports = engines;