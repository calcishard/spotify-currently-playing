require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const SpotifyStrategy = require("passport-spotify").Strategy;
const jwt = require("jsonwebtoken");
const cors = require("cors"); 
const session = require("express-session"); 
const path = require("path"); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET  ,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, '../frontend')));

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((error) => console.error("MongoDB connection error:", error));

const userSchema = new mongoose.Schema({
    spotifyId: { type: String, unique: true },
    displayName: String,
    email: String,
    country: String,
    product: String,
    profileImage: String,
});
const User = mongoose.model("User", userSchema);

passport.use(
    new SpotifyStrategy(
        {
            clientID: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            callbackURL: process.env.SPOTIFY_REDIRECT_URI,
            scope: [
                "user-read-currently-playing",
                "user-read-recently-played",
                "user-modify-playback-state",
                "user-read-playback-state",
                "user-read-email",
                "user-read-private",
            ],
        },
        async (accessToken, refreshToken, expires_in, profile, done) => {
            console.log("Access Token Received:", accessToken); 
            try {
                let user = await User.findOne({ spotifyId: profile.id });
                if (!user) {
                    user = await new User({
                        spotifyId: profile.id,
                        displayName: profile.displayName,
                        email: profile.emails[0].value,
                        country: profile.country,
                        product: profile.product,
                        profileImage: profile.photos[0] ? profile.photos[0].url : null,
                        accessToken: accessToken, 
                    }).save();
                } else {
                    user.accessToken = accessToken; 
                    await user.save();
                }
                done(null, user);
            } catch (error) {
                console.error("Error in Spotify strategy:", error);
                done(error, null);
            }
        }
    )
);


passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err, null);
        });
});

app.get("/auth/spotify", passport.authenticate("spotify"));

app.get(
    "/auth/spotify/callback",
    passport.authenticate("spotify", { failureRedirect: "/" }),
    (req, res) => {
        console.log("User in callback:", req.user);

        if (!req.user) {
            console.error("User in callback: undefined");
            return res.redirect("/");
        }

        const accessToken = req.user.accessToken;
        console.log("Access Token:", accessToken);
        
        res.redirect(`http://127.0.0.1:5500/frontend/main.html?access_token=${accessToken}`);
    }
);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});