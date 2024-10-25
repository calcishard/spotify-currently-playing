const CLIENT_ID = '8af5d68c29394b498a58679e13e1d03b';
const REDIRECT_URI = 'https://cheerful-bienenstitch-329df4.netlify.app/'; // Ensure this matches your Spotify app settings
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

// Initially hide elements
logoutButton.style.display = 'none';
songInfo.style.display = 'none';
recentlyPlayed.style.display = 'none';

// Login button click event
loginButton.addEventListener('click', () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPES}&response_type=token`;
    window.location.href = authUrl;
});

// Handle the redirect and extract the access token
const hash = window.location.hash;
if (hash) {
    const token = hash.split('&')[0].split('=')[1];
    accessToken = token; // Store the access token
    fetchCurrentlyPlaying(token);
    fetchRecentSongs(token);
    fetchInterval = setInterval(() => fetchCurrentlyPlaying(token), 1000);
    recentSongsInterval = setInterval(() => fetchRecentSongs(token), 1000);
    loginButton.style.display = 'none';
    logoutButton.style.display = 'block';
    songInfo.style.display = 'block';
    recentlyPlayed.style.display = 'block';
}

// Logout functionality
logoutButton.addEventListener('click', () => {
    accessToken = null;
    clearInterval(fetchInterval);
    clearInterval(recentSongsInterval);
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
                // Set song title as a hyperlink
                const songTitle = document.getElementById('song-title');
                songTitle.innerHTML = `<a href="${data.item.external_urls.spotify}" target="_blank" style="color: inherit; text-decoration: none;">${data.item.name}</a>`;
                
                // Set artist name as plain text
                document.getElementById('artist-name').textContent = data.item.artists.map(artist => artist.name).join(', ');
                
                // Set album cover image
                document.getElementById('album-cover').src = data.item.album.images[0].url;

                // Update slider and time display
                const duration = data.item.duration_ms; // Total duration in milliseconds
                const progress = data.progress_ms; // Current playback position in milliseconds
                songSlider.max = duration;
                songSlider.value = progress;
                updateTimeDisplays(progress, duration);
                sliderContainer.style.display = 'flex'; // Show slider when a song is playing
            } else {
                document.getElementById('song-title').textContent = 'No song playing';
                document.getElementById('artist-name').textContent = '';
                document.getElementById('album-cover').src = '';
                sliderContainer.style.display = 'none'; // Hide slider if no song is playing
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
