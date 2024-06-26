const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).exec();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL
},
async (token, tokenSecret, profile, done) => {
  try {
    const existingUser = await User.findOne({ googleId: profile.id }).exec();
    if (existingUser) {
      return done(null, existingUser);
    }

    const newUser = new User({
      googleId: profile.id,
      displayName: profile.displayName,
      emails: profile.emails // Stocke directement le tableau d'objets emails
    });

    await newUser.save();
    done(null, newUser);
  } catch (err) {
    done(err, null);
  }
}
));

module.exports = passport;
