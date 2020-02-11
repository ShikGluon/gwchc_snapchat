const express = require('express');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const SnapchatStrategy = require('passport-snapchat').Strategy;

let config = {};
try {
  fs.statSync(path.join(__dirname, './config'))
  config = require('./config');
} catch (e) {}

// Configure the Snapchat strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Snapchat API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authorization.
var base_url = ('https' + process.env.HEROKU_APP_NAME + '.herokuapp.com') || 'http://localhost:3000';
passport.use(new SnapchatStrategy({
    clientID: config.CLIENT_ID || process.env.CLIENT_ID,
    clientSecret: config.CLIENT_SECRET || process.env.CLIENT_SECRET,
    callbackURL: base_url + '/login/snapchat/callback',
    profileFields: ['id', 'displayName', 'bitmoji'],
    scope: ['user.display_name', 'user.bitmoji.avatar'],
    state: true,
    pkce: true
  },
  function(accessToken, refreshToken, profile, cb) {
    // In this example, the user's Snapchat profile is supplied as the user
    // record.  In a production-quality application, the Snapchat profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authorization with other identity
    // providers.
    return cb(null, profile);
  }));


// Configure Passport authenticated session persistence.
//
// In order to restore authorization state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Snapchat profile is serialized
// and deserialized.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


// Create a new Express application.
var app = express();

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({
  secret: config.SESSION_SECRET || process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}));

// Initialize Passport and restore authorization state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());


// Define routes.
app.get('/',
  function(req, res) {
    res.render('home', { user: req.user });
  });

// Login page, redirects to Snapchat
app.get('/login',
  function(req, res){
    res.render('login');
  });

// Snapchat login (users signs into snap)
app.get('/login/snapchat',
  passport.authenticate('snapchat'));

// Snapchat callback page (user doesn't see really)
app.get('/login/snapchat/callback',
  passport.authenticate('snapchat', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

// Profile page (displays profile information)
app.get('/profile',
      require('connect-ensure-login').ensureLoggedIn(),
      function(req, res){
        res.render('profile', { user: req.user });
      });

// Bitmoji sticker page (displays sticker picker)
app.get('/bitmojisticker',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.render('bitmojisticker', { user: req.user });
  });

  // Sticker share page 
app.get('/stickershare',
function(req, res){
  res.render('stickershare');
});

var server_port = process.env.PORT || 3000;
app.listen(server_port, () => {
  console.log('App listening on port: ' + server_port);
});
