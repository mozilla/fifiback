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

console.log('IN MAKEAPI, ' + engineId + ', ' + apiName + ', ' + term + ' + IMPL IS: ' + impl);
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
    var fileNames,
        filePath = path.join(__dirname, 'config.json'),
        jsExtRegExp = /\.js$/;

    this.config = config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
console.log('NOW IN LOAD CONFIG: ' + path.join(__dirname, 'engines'));

    fileNames = fs.readdirSync(path.join(__dirname, 'engines'));
    fileNames.forEach(function (fileName) {
      var id = fileName.replace(jsExtRegExp, '');
      impls[id] = require('./engines/' + id);
console.log('SETTING IMPL FOR: ' + id + ': ' + impls[id]);
    });
  }

};

engines.loadConfig();
module.exports = engines;