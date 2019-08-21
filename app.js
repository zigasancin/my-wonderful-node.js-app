const createError = require( 'http-errors' );
const express = require( 'express' );
const session = require( 'express-session' );
const path = require( 'path' );
const passport = require( 'passport' );
const Strategy = require( 'passport-local' ).Strategy;
const bodyParser = require( 'body-parser' );
const morgan = require( 'morgan' );
const ensureLogin = require( 'connect-ensure-login' );
const fetch = require( 'node-fetch' );
const db = require( './db' );

passport.use( new Strategy( ( username, password, cb ) => {
	db.findByUsername( username, ( err, user ) => {
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

passport.serializeUser( ( user, cb ) => {
	cb( null, user.id );
} );

passport.deserializeUser( ( id, cb ) => {
	db.findById( id, ( err, user ) => {
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

app.get( '/', ( req, res ) => {
	res.render( 'index', { user: req.user } );
} );

app.get( '/login', ( req, res ) => {
	res.render( 'login' );
} );

app.post( '/login', passport.authenticate( 'local', { failureRedirect: '/login' } ), ( req, res ) => {
	res.redirect( '/' );
} );

app.get( '/logout', ( req, res ) => {
	req.logout();
	res.redirect( '/' );
} );

app.get( '/promise', ensureLogin.ensureLoggedIn(), ( req, res ) => {
	fetch( 'https://bisi.si/wp-json/wp/v2/posts?categories=24&per_page=5' ).then(
		response => response.json()
	).then(
		response => {
			res.render( 'promise', { posts: response } );
		}
	).catch(
		error => {
			console.log( error );
		}
	);
} );

app.get( '/async-await-eat', ensureLogin.ensureLoggedIn(), async ( req, res ) => {
	try {
		const response = await fetch( 'https://bisi.si/wp-json/wp/v2/posts?include=9394,9119,2719,2489,2450' );
		const json = await response.json();
		res.render( 'async-await-eat', { posts: json } );
	} catch ( error ) {
		console.log( error );
	}
} );

app.use( ( req, res, next ) => {
	next( createError( 404 ) );
} );

app.use( ( err, req, res ) => {
	res.locals.message = err.message;
	res.locals.error = req.app.get( 'env' ) === 'development' ? err : {};
	res.status( err.status || 500 );
	res.render( 'error' );
} );

app.listen( 3000 );