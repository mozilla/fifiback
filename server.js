/*jshint node: true */
var engines = require('./engines');
var express = require('express');

var nconf = require('nconf');
nconf.argv().env().file({ file: 'local.json' });

var socketIo = require('socket.io');
var app = express();

var twitter = require('twitter-oauth');
var twitterAuth = twitter({
  consumerKey: nconf.get('twitterKey'),
  domain: nconf.get('domain'),
  consumerSecret: nconf.get('twitterSecret'),
  loginCallback: '/twitter/sessions/callback',
  completeCallback:  '/'
});

var SEARCH_LIMIT = 3;

app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.set('view options', { layout: false });
if (!process.env.NODE_ENV) {
  app.use(express.logger('dev'));
}
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(__dirname + '/public'));
app.locals.pretty = true;
app.use(app.router);

app.configure('development, test, staging', function () {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
  app.use(express.errorHandler());
});

app.use(express.logger());

app.get('/', function (req, res) {
  res.render('index');
});

app.get('/foursquare/sessions/connect', function(req, res) {
  res.writeHead(303, { 'location': foursquare.getAuthClientRedirectUrl() });
  res.end();
});

app.get('/foursquare/sessions/callback', function (req, res) {
  foursquare.getAccessToken({
    code: req.query.code
  }, function (error, accessToken) {
    if(error) {
      res.send('An error was thrown: ' + error.message);
    }
    else {
      // If we had sessions we could save the accessToken and redirect.
    }
  });
});

app.get('/twitter/sessions/connect', twitterAuth.oauthConnect);
app.get('/twitter/sessions/callback', twitterAuth.oauthCallback);
app.get('/twitter/sessions/logout', twitterAuth.logout);

app.get('/api/:query?', function (request, response) {
  var query = response.params.query;

  response.send('Hello: ' + query);
});

var port = process.env.PORT || nconf.get('authPort');

var io = socketIo.listen(app.listen(port, function () {
  console.log("Listening on " + port);
}));

io.configure(function () {
  io.set('transports', ['xhr-polling']);
  io.set('log level', 1);
  io.set('polling duration', 10);
});

io.sockets.on('connection', function (socket) {
  // FIND API. The main API
  socket.on('api/find', function (data) {
    var searchType = data.search || 'web'; // fallback to news for now

    var term = data.term || '';
    var location = (data.location && data.location.trim()) || '';
    var geolocation = (data.geolocation && data.geolocation.trim()) || '';
    var suggestSet = data.suggestSet || engines.config[searchType].suggestSet;
    var querySet = data.querySet || engines.config[searchType].querySet;
    var defaultSuggest = engines.getDefaultSuggest(searchType);
    var secondary = data.secondary || false;
    var suggestion;

    if (!term) {
      return socket.emit('api/suggestDone', {
        term: term,
        location: location,
        geolocation: geolocation
      });
    }

    function onError(err) {
      //Just eat errors for now.
      console.error('ERROR: ' + err);
      socket.emit('api/suggestDone', {
        term: term,
        location: location,
        geolocation: geolocation
      });
    }

    suggestSet.forEach(function (engineId) {
      engines.suggest(term, location, geolocation, engineId).then(function (result) {
          //Collapse down the results from boxfish to a simple array
          if(engineId === "boxfish.com"){
              var bfResultsArr = [];
              //append channel names that match autocomplete
              if(result.channels){
                  result.channels.forEach(function(item){
                      bfResultsArr.append(item.name);
                  });
              }

              //append programs
              if(result.programs){
                  result.programs.forEach(function(item){
                      bfResultsArr.append(item.name);
                  });
              }
              //append mentions
              if(result.programs){
                  result.programs.forEach(function(item){
                      bfResultsArr.append(item.mention);
                  });
              }

              //overwrite the result array to match what the existing code expects
              //TODO we should probably rethink this code path and how the default and suggestSet engines get triggered and how to
              // generically manipulate their results, our current methodology is a little tied to google and bing

              result = [term, bfResultsArr];

              console.log(bfResultsArr)
          }

          socket.emit('api/suggestDone', {
          engineId: engineId,
          term: term,
          location: location,
          geolocation: geolocation,
          secondary: false,
          result: result[1].slice(0, SEARCH_LIMIT)
        });
      });
    });

    /*
      iterate through all suggestion engines for the term sent
      NOTE: the default suggestion engine `defaultSuggest` should be the first element in the `suggestSet` array
      once the default engine returns suggestions we fire off a similar set of queries to the `suggestSet` engines
      minus the default engine using the first suggest term returned from the default engine
    */
    /*
    suggestSet.forEach(function (engineId) {
      engines.suggest(term, location, geolocation, engineId).then(function (result) {
        socket.emit('api/suggestDone', {
          engineId: engineId,
          term: term,
          location: location,
          geolocation: geolocation,
          secondary: false,
          result: result[1].slice(0, SEARCH_LIMIT)
        });

        if (engineId === defaultSuggest.id) {
          suggestion = result[1][0];

          // drop our first engine
          suggestSet.slice(1).forEach(function (id) {
            engines.suggest(suggestion, location, geolocation, id).then(function (r) {
              // console.log(term, suggestion, id, r[1]);
              socket.emit('api/suggestDone', {
                engineId: id,
                originalTerm: term,
                term: suggestion,
                location: location,
                geolocation: geolocation,
                secondary: true,
                result: r[1].slice(0, SEARCH_LIMIT)
              });
            }, function (err) {
              //Just eat errors for now.
              console.error('ERROR: ' + err);
              socket.emit('api/suggestDone', {
                engineId: id,
                term: suggestion,
                secondary: true,
                location: location,
                geolocation: geolocation
              });
            });
          });
        }
      }, function (err) {
        //Just eat errors for now.
        console.error('ERROR: ' + err);
        socket.emit('api/suggestDone', {
          engineId: engineId,
          term: term,
          secondary: false,
          location: location,
          geolocation: geolocation
        });
      });
    }, onError);
*/
  });

  // SUGGEST API
  socket.on('api/suggest', function (data) {
    var searchType = data.search || 'web'; // fallback to web for now
      console.log('default search suggest type ', searchType);

    var set = data.set || engines.config[searchType].suggestSet;
    var term = data.term || '';
    var location = (data.location && data.location.trim()) || '';
    var geolocation = (data.geolocation && data.geolocation.trim()) || '';

    set.forEach(function (engineId) {
      // Fast path for no term
      if (!term) {
        return socket.emit('api/suggestDone', {
          engineId: engineId,
          term: term,
          location: location,
          geolocation: geolocation,
          search: searchtype
        });
      }

      engines.suggest(term, location, geolocation, engineId).then(function (result) {
        socket.emit('api/suggestDone', {
          engineId: engineId,
          term: term,
          location: location,
          geolocation: geolocation,
          result: result,
          search: searchType
        });
      }, function (err) {
        //Just eat errors for now.
        console.error('ERROR: ' + err);
        socket.emit('api/suggestDone', {
          engineId: engineId,
          term: term,
          location: location,
          geolocation: geolocation,
          search: searchType
        });
      });
    });
  });

  // QUERY API
  socket.on('api/query', function (data) {
    var searchType = data.search || 'news'; // fallback to food for now
    console.log('default search query type ', searchType);
      console.log(data.search);
    var term = data.term || '';
    var location = (data.location && data.location.trim()) || '';
    var geolocation = (data.geolocation && data.geolocation.trim()) || '';

    if (!term) {
      return socket.emit('api/queryDone', {
        engineId: data.engineId,
        term: term,
        location: location,
        geolocation: geolocation,
        search: searchType
      });
    }

    engines.query(term, location, geolocation, data.engineId).then(function (result) {
      socket.emit('api/queryDone', {
        engineId: data.engineId,
        term: term,
        location: location,
        geolocation: geolocation,
        result: result,
        search: searchType
      });
    }, function (err) {
      //Just eat errors for now.
      console.error('ERROR: ' + err);
      socket.emit('api/queryDone', {
        engineId: data.engineId,
        term: term,
        location: location,
        geolocation: geolocation,
        search: searchType
      });
    });
  });
});
