const CLIENT_ID = '8af5d68c29394b498a58679e13e1d03b';
const REDIRECT_URI = 'https://spotistats.dev/'; // Ensure this matches your Spotify app settings
const SCOPES = 'user-read-currently-playing user-read-recently-played';
let accessToken;
let fetchInterval;
let recentSongsInterval; // Interval for recently played songs

const loginButton = document.getElementById('login');
const logoutButton = document.getElementById('logout');
const songInfo = document.getElementById('song-info');
const currentlyPlaying = document.getElementById('currently-playing');
const recentSongsList = document.getElementById('recent-songs-list');
const recentlyPlayed = document.getElementById('recently-played');
const sliderContainer = document.getElementById('slider-container');
const currentTimeDisplay = document.getElementById('current-time');
const totalTimeDisplay = document.getElementById('total-time');
const songSlider = document.getElementById('song-slider');
const mobileLogoutButton = document.getElementById('mobile-logout');
const lyricsTab = document.getElementById('lyrics-tab');

// Initially hide elements
logoutButton.style.display = 'none';
songInfo.style.display = 'none';
recentlyPlayed.style.display = 'none';

function isMobileView() {
    return window.innerWidth <= 878; // Mobile breakpoint at 878px
}

// Login button click event
const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPES}&response_type=token`;
loginButton.addEventListener('click', () => {
    const loginWindow = window.location.href = authUrl;
    if (hash) {
        console.log("hello");
        loginWindow.close();
        window.location.href = authUrl;
    }
});

// Handle the redirect and extract the access token
const hash = window.location.hash;
if (hash.includes("access_token")) {
    const params = new URLSearchParams(hash.substring(1));
    accessToken = params.get('access_token'); // Store the access token

    // Clean up the URL by removing the hash
    window.history.replaceState({}, document.title, REDIRECT_URI);

    // Proceed with fetching data
    fetchCurrentlyPlaying(accessToken);
    fetchRecentSongs(accessToken);
    fetchInterval = setInterval(() => fetchCurrentlyPlaying(accessToken), 1000);
    recentSongsInterval = setInterval(() => fetchRecentSongs(accessToken), 1000);

    // Update UI
    loginButton.style.display = 'none';
    logoutButton.style.display = 'block';
    songInfo.style.display = 'block';
    recentlyPlayed.style.display = 'block';
    document.getElementById('lyrics-container').style.display = 'block';
    currentlyPlaying.textContent = "Currently Playing";

    if (isMobileView()) {
        document.getElementById('app').style.height = '150vh';
        lyricsTab.style.display = 'block';
        mobileLogoutButton.style.display = 'block';
    }
}

// Logout functionality
logoutButton.addEventListener('click', () => {
    // Clear access token in JavaScript
    accessToken = null;
    clearInterval(fetchInterval);
    clearInterval(recentSongsInterval);

    // Clear user interface elements
    loginButton.style.display = 'block';
    logoutButton.style.display = 'none';
    songInfo.style.display = 'none';
    currentlyPlaying.style.display = 'none';
    document.getElementById('song-title').textContent = '';
    document.getElementById('artist-name').textContent = '';
    document.getElementById('album-cover').src = '';
    recentSongsList.innerHTML = '';
    recentlyPlayed.style.display = 'none';
    sliderContainer.style.display = 'none'; // Hide slider when logged out      
    document.getElementById('lyrics-container').style.display = 'none';
    lyricsTab.style.display = 'none';
    mobileLogoutButton.style.display = 'none';
    currentlyPlaying.textContent = "Spotistats";
    if (isMobileView()) {
        document.getElementById('app').style.height = '100vh';
    }

    // Remove access token from URL
    window.location.hash = '';

    // Open Spotify logout in a new window and redirect back
    const logoutWindow = window.open('https://accounts.spotify.com/logout', '_blank');
    setTimeout(() => {
        logoutWindow.close(); // Close the Spotify logout tab
        window.location.href = REDIRECT_URI; // Redirect back to the app's main page
    }, 1000); // Adjust timeout as needed for logout to complete
});

mobileLogoutButton.addEventListener('click', () => {
    // Clear access token in JavaScript
    accessToken = null;
    clearInterval(fetchInterval);
    clearInterval(recentSongsInterval);

    // Clear user interface elements
    loginButton.style.display = 'block';
    logoutButton.style.display = 'none';
    songInfo.style.display = 'none';
    currentlyPlaying.style.display = 'none';
    document.getElementById('song-title').textContent = '';
    document.getElementById('artist-name').textContent = '';
    document.getElementById('album-cover').src = '';
    recentSongsList.innerHTML = '';
    recentlyPlayed.style.display = 'none';
    sliderContainer.style.display = 'none'; // Hide slider when logged out      
    document.getElementById('lyrics-container').style.display = 'none';

    // Remove access token from URL
    window.location.hash = '';

    // Open Spotify logout in a new window and redirect back
    const logoutWindow = window.open('https://accounts.spotify.com/logout', '_blank');
    setTimeout(() => {
        logoutWindow.close(); // Close the Spotify logout tab
        window.location.href = REDIRECT_URI; // Redirect back to the app's main page
    }, 1000); // Adjust timeout as needed for logout to complete
});


// Fetch currently playing song
async function fetchCurrentlyPlaying(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.is_playing) {
                const songTitle = data.item.name;
                const artistName = data.item.artists[0].name;

                // Set song title as a hyperlink
                document.getElementById('song-title').innerHTML = `<a href="${data.item.external_urls.spotify}" target="_blank">${songTitle}</a>`;
                document.getElementById('artist-name').innerHTML = `<span class="artist-name">${data.item.artists.map(artist => artist.name).join(', ')}</span>`;
                document.getElementById('album-cover').src = data.item.album.images[0].url;

                // Fetch lyrics
                fetchLyrics(songTitle, artistName);

                // Update slider and time display
                const duration = data.item.duration_ms;
                const progress = data.progress_ms;
                songSlider.max = duration;
                songSlider.value = progress;
                updateTimeDisplays(progress, duration);
                sliderContainer.style.display = 'flex';
            } else {
                document.getElementById('song-title').textContent = 'No song playing';
                document.getElementById('artist-name').textContent = '';
                document.getElementById('album-cover').src = '';
                document.getElementById('lyrics').textContent = 'Lyrics not available.';
                sliderContainer.style.display = 'none';
            }
        } else {
            console.error('Failed to fetch currently playing song:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching currently playing song:', error);
    }
}

// Fetch recently played songs
async function fetchRecentSongs(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/recently-played', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            recentSongsList.innerHTML = ''; // Clear the list
            data.items.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <img src="${item.track.album.images[2].url}" alt="Album Cover">
                    <div>
                        <span class="song-title"><a href="${item.track.external_urls.spotify}" target="_blank">${item.track.name}</a></span><br>
                        <span class="artist-name">${item.track.artists.map(artist => artist.name).join(', ')}</span>
                    </div>
                `;
                recentSongsList.appendChild(li);
            });
        } else {
            console.error('Failed to fetch recently played songs:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching recently played songs:', error);
    }
}

// Fetch lyrics for the currently playing song
async function fetchLyrics(songTitle, artistName) {
    try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${artistName}/${songTitle}`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('lyrics').textContent = data.lyrics || 'Lyrics not found.';
            if (isMobileView()) {
                document.getElementById('app').style.height = '150vh';
            }
        } else {
            console.error('Failed to fetch lyrics:', response.statusText);
            document.getElementById('lyrics').textContent = 'Lyrics not found.';
            if (isMobileView()) {
                document.getElementById('app').style.height = '110vh';
            }
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        document.getElementById('lyrics').textContent = 'Lyrics not available.';
    }
}

// Update time displays
function updateTimeDisplays(currentTime, totalTime) {
    currentTimeDisplay.textContent = formatTime(currentTime);
    totalTimeDisplay.textContent = formatTime(totalTime);
}

// Format time in mm:ss
function formatTime(milliseconds) {
    const minutes = Math.floor((milliseconds / 1000) / 60);
    const seconds = Math.floor((milliseconds / 1000) % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

document.getElementById("lyrics-tab").addEventListener("click", function() {
    document.getElementById("lyrics-container").scrollIntoView({ behavior: "smooth" });
});
