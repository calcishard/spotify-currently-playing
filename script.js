const CLIENT_ID = '8af5d68c29394b498a58679e13e1d03b';
const REDIRECT_URI = 'https://cheerful-bienenstitch-329df4.netlify.app'; // Ensure this matches your Spotify app settings
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
    fetchInterval = setInterval(() => fetchCurrentlyPlaying(token), 5000);
    recentSongsInterval = setInterval(() => fetchRecentSongs(token), 10000);
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
                document.getElementById('song-title').textContent = data.item.name;
                document.getElementById('artist-name').textContent = data.item.artists.map(artist => artist.name).join(', ');
                document.getElementById('album-cover').src = data.item.album.images[0].url;
            } else {
                document.getElementById('song-title').textContent = 'No song playing';
                document.getElementById('artist-name').textContent = '';
                document.getElementById('album-cover').src = '';
            }
        } else {
            console.error('Error fetching currently playing song', response.status);
            handleAuthError(response.status);
        }
    } catch (error) {
        console.error('Error fetching currently playing song', error);
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
            const songs = data.items;
            recentSongsList.innerHTML = ''; // Clear previous songs

            songs.forEach(song => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                
                const img = document.createElement('img');
                img.src = song.track.album.images[0].url;
                img.alt = 'Album Cover';
                img.style.width = '50px';
                img.style.marginRight = '10px';

                const songInfo = document.createElement('span');
                songInfo.textContent = `${song.track.name} - ${song.track.artists.map(artist => artist.name).join(', ')}`;

                li.appendChild(img);
                li.appendChild(songInfo);
                recentSongsList.appendChild(li);
            });
        } else {
            console.error('Error fetching recently played songs', response.status);
            handleAuthError(response.status);
        }
    } catch (error) {
        console.error('Error fetching recently played songs', error);
    }
}

// Handle authentication errors
function handleAuthError(status) {
    if (status === 401) {
        alert('Session expired. Please log in again.');
        window.location.reload();
    }
}

// Clear the interval on window unload
window.addEventListener('beforeunload', () => {
    clearInterval(fetchInterval);
    clearInterval(recentSongsInterval);
});
