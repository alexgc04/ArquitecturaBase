const passport=require("passport"); 
try { require('dotenv').config(); } catch(_) {}
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const BASE_URL = process.env.BASE_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

passport.serializeUser(function(user, done) { 
    done(null, user); 
});

passport.deserializeUser(function(obj, done) { 
    done(null, obj); 
});

passport.use(new GoogleStrategy({ 
    clientID: GOOGLE_CLIENT_ID, 
    clientSecret: GOOGLE_CLIENT_SECRET, 
    callbackURL: `${BASE_URL}/google/callback` 
}, 
 function(accessToken, refreshToken, profile, done) { 
     return done(null, profile); 
 }
));

const GoogleOneTapStrategy = require("passport-google-one-tap").GoogleOneTapStrategy;
passport.use(
    new GoogleOneTapStrategy(
        {
            client_id: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            verifyCsrfToken: false,
        },
        function (profile, done) {
            return done(null, profile);
        }
    )
);