/*jshint node: true */
var config;
var suggestImpl = {};
var impls = {};

var path = require('path');
var fs = require('fs');
var q = require('q');

function makeApi(apiName) {
  return function (term, location, geolocation, engineId) {
    var d;
    var impl = impls[engineId];

    //Just ignore search engines we do not know
    if (!impl) {
      d = q.defer();
      d.resolve([]);
      return d.promise;
    } else {
      if (impl[apiName + 'Translate']) {
        return impl[apiName + 'Translate'](term, impl[apiName](term, location, geolocation));
      } else {
        return impl[apiName](term, location, geolocation);
      }
    }
  };
}

var engines = {
  suggest: makeApi('suggest'),
  query: makeApi('query'),

  get: function (engineId) {
    return impls[id];
  },

  getDefaultSuggest: function (searchType) {
    return suggestImpl[searchType];
  },

  loadConfig: function () {
    var fileNames,
        filePath = path.join(__dirname, 'config.json'),
        jsExtRegExp = /\.js$/;

    this.config = config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    fileNames = fs.readdirSync(path.join(__dirname, 'engines'));
    fileNames.forEach(function (fileName) {
      var id = fileName.replace(jsExtRegExp, '');
      impls[id] = require('./engines/' + id);
    });

    for (k in config) {
      suggestImpl[k] = impls[config[k].suggestDefault];

      if (!suggestImpl[k]) {
        console.log('No suggest implementation for ' + config[k].suggestDefault);
      }
    }
  }

};

engines.loadConfig();
module.exports = engines;
