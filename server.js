if ( process.env.NEW_RELIC_HOME ) {
  require( 'newrelic' );
}

/*jshint node: true */
var engines = require('./engines');
var express = require('express');

var nconf = require('nconf');
nconf.argv().env().file({ file: 'local.json' });

var socketIo = require('socket.io');
var transports = ('PORT' in process.env)? ['xhr-polling'] : ['websocket', 'xhr-polling'];
var app = express();

var SEARCH_LIMIT = 3;

app.use(express.logger());

app.get('/', function(request, response) {
  response.send('Hello World!');
});
app.get('/api/:query?', function(request, response) {
  var query = response.params.query;

  response.send('Hello: ' + query);
});

var port = process.env.PORT || 5000;

var io = socketIo.listen(app.listen(port, function() {
  console.log("Listening on " + port);
}));

// Heroku does not support web sockets, just long polling
io.configure(function () {
  io.set('transports', transports);
  io.set('log level', 1);
  io.set('polling duration', 10);
});

io.sockets.on('connection', function (socket) {
  // FIND API. The main API
  socket.on('api/find', function (data) {
    var term = data.term || '';
    var location = (data.location && data.location.trim()) || '';
    var suggestSet = data.suggestSet || engines.config.suggestSet;
    var querySet = data.querySet || engines.config.querySet;
    var defaultSuggest = engines.getDefaultSuggest();
    var secondary = data.secondary || false;
    var suggestion;

    if (!term) {
      return socket.emit('api/suggestDone', {
        term: term,
        location: location
      });
    }

    function onError(err) {
      //Just eat errors for now.
      console.error('ERROR: ' + err);
      socket.emit('api/suggestDone', {
        term: term,
        location: location
      });
    }

    /*
      iterate through all suggestion engines for the term sent
      NOTE: the default suggestion engine `defaultSuggest` should be the first element in the `suggestSet` array
      once the default engine returns suggestions we fire off a similar set of queries to the `suggestSet` engines
      minus the default engine using the first suggest term returned from the default engine
    */
    suggestSet.forEach(function (engineId) {
      engines.suggest(term, location, engineId).then(function (result) {
        socket.emit('api/suggestDone', {
          engineId: engineId,
          term: term,
          location: location,
          secondary: false,
          result: result[1].slice(0, SEARCH_LIMIT)
        });

        if (engineId === defaultSuggest.id) {
          suggestion = result[1][0];

          // drop our first engine
          suggestSet.slice(1).forEach(function (id) {
            engines.suggest(suggestion, location, id).then(function (r) {
              // console.log(term, suggestion, id, r[1]);
              socket.emit('api/suggestDone', {
                engineId: id,
                originalTerm: term,
                term: suggestion,
                location: location,
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
                location: location
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
          location: location
        });
      });
    }, onError);
  });

  // SUGGEST API
  socket.on('api/suggest', function (data) {
    var set = data.set || engines.config.suggestSet,
        term = data.term || '',
        location = (data.location && data.location.trim()) || '';

    set.forEach(function (engineId) {
      // Fast path for no term
      if (!term) {
        return socket.emit('api/suggestDone', {
          engineId: engineId,
          term: term,
          location: location
        });
      }

      engines.suggest(term, location, engineId).then(function (result) {
        socket.emit('api/suggestDone', {
          engineId: engineId,
          term: term,
          location: location,
          result: result
        });
      }, function (err) {
        //Just eat errors for now.
        console.error('ERROR: ' + err);
        socket.emit('api/suggestDone', {
          engineId: engineId,
          term: term,
          location: location
        });
      });
    });
  });

  socket.on('api/suggestImage', function (data) {
    var term = (data.term && data.term.trim()) || '';
    var location = (data.location && data.location.trim()) || '';

    if (!term) {
      return socket.emit('api/suggestImageDone', {
        term: term,
        image: ''
      });
    }

    engines.query(term, location, 'google.com').then(function (result) {
      socket.emit('api/suggestImageDone', {
        engineId: data.engineId,
        term: term,
        location: location,
        result: result
      });
    }, function (err) {
      //Just eat errors for now.
      console.error('ERROR: ' + err);
      socket.emit('api/suggestImageDone', {
        engineId: data.engineId,
        term: term,
        location: location,
        result: ''
      });
    });
  });

  // QUERY API
  socket.on('api/query', function (data) {
    var term = data.term || '';
    var location = (data.location && data.location.trim()) || '';

    if (!term) {
      return socket.emit('api/queryDone', {
        engineId: data.engineId,
        term: term,
        location: location
      });
    }

    engines.query(term, location, data.engineId).then(function (result) {
      socket.emit('api/queryDone', {
        engineId: data.engineId,
        term: term,
        location: location,
        result: result
      });
    }, function (err) {
      //Just eat errors for now.
      console.error('ERROR: ' + err);
      socket.emit('api/queryDone', {
        engineId: data.engineId,
        term: term,
        location: location
      });
    });
  });
});
