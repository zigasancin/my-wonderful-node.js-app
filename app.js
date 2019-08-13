const createError = require( 'http-errors' );
const express = require( 'express' );
const session = require( 'express-session' );
const path = require( 'path' );
const passport = require( 'passport' );
const Strategy = require( 'passport-local' ).Strategy;
const bodyParser = require( 'body-parser' );
const morgan = require( 'morgan' );
const ensureLogin = require( 'connect-ensure-login' );
const db = require( './db' );

passport.use( new Strategy( function ( username, password, cb ) {
	db.findByUsername( username, function ( err, user ) {
		if ( err ) {
			return cb( err );
		}

		if ( ! user ) {
			return cb( null, false );
		}

		if ( user.password != password ) {
			return cb( null, false );
		}

		return cb( null, user );
	} );
} ) );

passport.serializeUser( function ( user, cb ) {
	cb( null, user.id );
} );

passport.deserializeUser( function ( id, cb ) {
	db.findById( id, function ( err, user ) {
		if ( err) {
			return cb( err );
		}

		cb( null, user );
	} );
} );

var app = express();

app.set( 'views', path.join( __dirname, 'views' ) );
app.set( 'view engine', 'pug' );

app.use( morgan('combined') );
app.use( session( { secret: 'The name is what your thing is called', resave: false, saveUninitialized: false } ) );
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( passport.initialize() );
app.use( passport.session() );

app.use( express.static( path.join( __dirname, 'public' ) ) );

app.use( '/static', express.static( path.join( __dirname, 'public' ) ) );

app.get( '/', function ( req, res ) {
	res.render( 'index', { user: req.user } );
} );

app.get( '/login', function ( req, res ) {
	res.render( 'login' );
} );

app.post( '/login', passport.authenticate( 'local', { failureRedirect: '/login' } ), function ( req, res ) {
	res.redirect( '/' );
} );

app.get( '/logout', function ( req, res ) {
	req.logout();
	res.redirect( '/' );
} );

app.get( '/promise', ensureLogin.ensureLoggedIn(), function ( req, res ) {
	res.render( 'promise', { user: req.user } );
} );

app.use( function( req, res, next ) {
	next( createError( 404 ) );
} );

app.use( function( err, req, res ) {
	res.locals.message = err.message;
	res.locals.error = req.app.get( 'env' ) === 'development' ? err : {};
	res.status( err.status || 500 );
	res.render( 'error' );
} );

app.listen( 3000 );