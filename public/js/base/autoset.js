define(['./utils'], function (utils) {
  'use strict';

  var Autoset = function () {
    var self = this;

    this.engineClear = function () {
      this.results = {};
      this.terms = null;
        this.engines = {
            'web': {
                'bing.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'twitter.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'wikipedia.infobox': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'boxfish.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                }
            },
            'news': {
                'bing.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'bing.news': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'twitter.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'boxfish.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'wikipedia.infobox': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
//                'nytimes.article': {
//                    conceptsPrimary: [],
//                    conceptsSecondary: []
//                }
                'guardian.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'npr.org': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                }
            },
            'food': {
                'bing.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'yelp.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
//                'en.wikipedia.org': {
//                    conceptsPrimary: [],
//                    conceptsSecondary: []
//                },
//                'wikipedia.infobox': {
//                    conceptsPrimary: [],
//                    conceptsSecondary: []
//                },
                'twitter.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'foursquare.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                }
//                'google.rightside': {
//                    conceptsPrimary: [],
//                    conceptsSecondary: []
//                }
            },
            'local': {
                'bing.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'yelp.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
//                'wikipedia.infobox': {
//                    conceptsPrimary: [],
//                    conceptsSecondary: []
//                },
                'twitter.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'foursquare.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                }
            },
            'apps': {
                'bing.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'twitter.com': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                },
                'firefox.marketplace': {
                    conceptsPrimary: [],
                    conceptsSecondary: []
                }
            }
        };
    };

    this.engineClear();

    this.generate = function (terms, value, engineId, search, callback) {
      if (this.terms === null) {
        this.terms = terms;
      }

      if (value && this.terms === terms) {
        var count = 0;

        for (var i = 0, val; val = value[i]; i += 1) {
          count ++;

          val = val.toString().toLowerCase();

          if (!this.results[val] && val.length > 0 && this.engines[search][engineId].conceptsPrimary.length < 3) {
            this.results[val] = true;
            this.engines[search][engineId].conceptsPrimary.push({
              concept: val
            });
          }

          if (count === value.length - 1) {
            callback(true);
          }
        }
      }
    };

    this.generateSecondary = function (terms, value, engineId, search, callback) {
      if (this.terms === null) {
        this.terms = terms;
      }

      if (value && this.terms === terms) {
        var count = 0;

        for (var i = 0, val; val = value[i]; i += 1) {
          count ++;

          val = val.toString().toLowerCase();

          if (!this.results[val] && val.length > 0 && this.engines[search][engineId].conceptsSecondary.length < 3) {
            this.results[val] = true;
            this.engines[search][engineId].conceptsSecondary.push({
              concept: val
            });
          }

          if (count === value.length - 1) {
            callback(true);
          }
        }
      }
    };
  };

  return Autoset;
});
