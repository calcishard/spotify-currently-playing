// Load environment variables
require("dotenv").config();
console.log("Spotify Client ID:", process.env.SPOTIFY_CLIENT_ID);
console.log("Spotify Client Secret:", process.env.SPOTIFY_CLIENT_SECRET);

const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const SpotifyStrategy = require("passport-spotify").Strategy;
const jwt = require("jsonwebtoken");
const cors = require("cors"); // Ensure you have this line
const session = require("express-session"); // Add express-session
const path = require("path"); // Require path module

const app = express();
const PORT = process.env.PORT || 3000;

// Use CORS middleware
app.use(cors({
    origin: 'http://127.0.0.1:5500', // Allow requests from this origin
    credentials: true // Allow credentials if you're using sessions
}));
app.use(express.json());

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET  , // Replace with your secret key
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' } // Set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((error) => console.error("MongoDB connection error:", error));

// User schema and model
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
                "user-read-email",
                "user-read-private",
            ],
        },
        async (accessToken, refreshToken, expires_in, profile, done) => {
            console.log("Access Token Received:", accessToken); // Debug log
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
                        accessToken: accessToken, // Store the access token here
                    }).save();
                } else {
                    user.accessToken = accessToken; // Update access token on each login
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


// Serialize and deserialize user instances to and from session
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

// Spotify Authentication Routes
app.get("/auth/spotify", passport.authenticate("spotify"));

app.get(
    "/auth/spotify/callback",
    passport.authenticate("spotify", { failureRedirect: "/" }),
    (req, res) => {
        console.log("User in callback:", req.user); // Log the user object

        // Check if the user is authenticated
        if (!req.user) {
            console.error("User in callback: undefined");
            return res.redirect("/"); // Handle error or redirect
        }

        const accessToken = req.user.accessToken; // Safely access the access token
        console.log("Access Token:", accessToken);
        
        // Redirect to main.html on the other server and include the token in local storage
        res.redirect(`http://127.0.0.1:5500/frontend/main.html?access_token=${accessToken}`);
    }
);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});