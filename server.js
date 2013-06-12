var engines = require('./engines'),
    express = require('express'),
    socketIo = require('socket.io'),
    app = express();

app.use(express.logger());

app.get('/', function(request, response) {
  response.send('Hello World!');
});


app.get('/api/:query?', function(request, response) {
  var query = req.params.query;

  response.send('Hello: ' + query);
});


var port = process.env.PORT || 5000;


var io = socketIo.listen(app.listen(port, function() {
  console.log("Listening on " + port);
}));

// Heroku does not support web sockets, just long polling
io.configure(function () {
  io.set("transports", ["xhr-polling"]);
  io.set("polling duration", 10);
});

io.sockets.on('connection', function (socket) {
  socket.on('api/suggest', function (data) {
      var set = data.set || engines.config.suggestSet;
      set.forEach(function (engineId) {
        engines.suggest(data.term, engineId).then(function (result) {
          socket.emit('api/suggested', {
            engineId: engineId,
            result: result
          });
        }, function (err) {
          //Just eat errors for now.
          console.error('ERROR: ' + err);
          socket.emit('api/suggested', {
            engineId: engineId
          });
        });
      });
  });
  socket.on('api/query', function(data) {
    engines.query(data.term, data.engineId).then(function (result) {
      socket.emit('api/queried', {
        engineId: engineId,
        result: result
      });
    }, function (err) {
      //Just eat errors for now.
      console.error('ERROR: ' + err);
      socket.emit('api/queried', {
        engineId: engineId
      });
    });
  });
});