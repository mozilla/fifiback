module.exports = new (require('../Engine'))({
  "id": "linkedin.com",
  "name": "LinkedIn",
  "site": "http://www.linkedin.com/search/fpsearch",
  "queryUrl": "http://www.linkedin.com/search/fpsearch?keywords={searchTerms}",
  "suggestUrl": "http://www.linkedin.com/ta/federator?query={searchTerms}&types=mynetwork,company,group,sitefeature,skill",
  "icon": "http://static01.linkedin.com/scds/common/u/img/favicon_v3.ico"
});
