var express = require('express'),
    path = require('path'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    bodyParser = require('body-parser'),
    passportConfig = require('./passport'),
    config = require('./config'),
    routes = require('./routes/routes'),
    fs = require('fs'),
    swagger = require('swagger-jsdoc');

// Connect to MongoDB
//mongoose.connect(config.mongo);

// Express config
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

// Passport config
passportConfig();
app.use(passport.initialize());

// swagger docs
// ... initialize swagger-jsdoc
var swaggerSpec = swagger({
  swaggerDefinition: {
    basePath: '/auth'
  },
  apis: fs.readdirSync(path.join(__dirname, './routes/')).map(function(i){ return path.join(__dirname, './routes/') + i})
});
// ... routes
app.get('/docs.json', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use(express.static(path.join(__dirname, 'public')));
app.use(routes);

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        if (!isNaN(err)) {
            var e = new Error(err == 400 ? "Parámetro incorrecto" : "No encontrado");
            e.status = err;
            err = e;
        } else if (typeof err == "string") {
            var e = new Error(err);
            e.status = 400;
            err = e;
        }
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
