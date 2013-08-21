/*jshint node: true */
var q = require('q');
var wikipedia = require('wikipedia-js');

module.exports = new (require('../Engine'))({
  "id": "en.wikipedia.org",
  "name": "Wikipedia (en)",
  "site": "http://en.wikipedia.org/w/opensearch_desc.php",
  "queryFunc": function (term) {
    var options = {
      query: term,
      format: 'html',
      summaryOnly: true
    };

    var d = q.defer();

    console.log('wikipedia queryFunc: ' + term);

    wikipedia.searchArticle(options, function (err, htmlWikiText) {
      if (err) {
        d.reject(err);
      } else {
        d.resolve(htmlWikiText);
      }
    });

    return d.promise;
  },
  "suggestUrl": "http://en.wikipedia.org/w/api.php?action=opensearch&search={searchTerms}",
  "icon": "data:image/x-icon;base64,AAABAAEAEBAQAAEABAAoAQAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAEAgQAhIOEAMjHyABIR0gA6ejpAGlqaQCpqKkAKCgoAPz9%2FAAZGBkAmJiYANjZ2ABXWFcAent6ALm6uQA8OjwAiIiIiIiIiIiIiI4oiL6IiIiIgzuIV4iIiIhndo53KIiIiB%2FWvXoYiIiIfEZfWBSIiIEGi%2FfoqoiIgzuL84i9iIjpGIoMiEHoiMkos3FojmiLlUipYliEWIF%2BiDe0GoRa7D6GPbjcu1yIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
 });
