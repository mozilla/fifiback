/*jshint node: true */
var engines = require('./engines');
var express = require('express');
var socketIo = require('socket.io');
var app = express();

var SEARCH_LIMIT = 9;

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
  io.set('transports', ['websocket']);
  io.set('log level', 1);
  //io.set("polling duration", 10);
});

io.sockets.on('connection', function (socket) {
  // FIND API. The main API
  socket.on('api/find', function (data) {
    var term = (data.term && data.term.trim()) || '';
    var location = (data.location && data.location.trim()) || '';
    var querySet = data.querySet || engines.config.querySet;
    var defaultSuggest = engines.getDefaultSuggest();

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

    defaultSuggest.suggest(term, location).then(function (results) {
      // Send the list of suggestions
      results[1] = results[1].slice(0, SEARCH_LIMIT);
      console.log(results[1])
      socket.emit('api/suggestDone', {
        engineId: defaultSuggest.id,
        term: term,
        location: location,
        result: results
      });

      var suggestion = results[1][0];

      // Now start querying with the default query set.
      querySet.forEach(function (engineId) {
        engines.suggest(suggestion, location, engineId).then(function (result) {

          result[1] = result[1].slice(0, SEARCH_LIMIT);
          console.log(result[1])
          socket.emit('api/suggestDone', {
            engineId: engineId,
            term: term,
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
    }, onError);
  });

  // SUGGEST API
  socket.on('api/suggest', function (data) {
      var set = data.set || engines.config.suggestSet,
          term = (data.term && data.term.trim()) || '',
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

  // QUERY API
  socket.on('api/query', function(data) {
    var term = (data.term && data.term.trim()) || '';
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
