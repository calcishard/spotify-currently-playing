const CLIENT_ID = '8af5d68c29394b498a58679e13e1d03b';
const REDIRECT_URI = 'http://127.0.0.1:5500/index.html';
const SCOPES = 'user-read-currently-playing user-read-recently-played';
let accessToken;
let fetchInterval;
let recentSongsInterval;

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

logoutButton.style.display = 'none';

loginButton.addEventListener('click', () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPES}&response_type=token`;
    window.location.href = authUrl;
});

const hash = window.location.hash;
if (hash) {
    const token = hash.split('&')[0].split('=')[1];
    accessToken = token;
    fetchCurrentlyPlaying(token);
    fetchRecentSongs(token);
    fetchInterval = setInterval(() => fetchCurrentlyPlaying(token), 1000);
    recentSongsInterval = setInterval(() => fetchRecentSongs(token), 1000);
    loginButton.style.display = 'none';
    logoutButton.style.display = 'block';
    songInfo.style.display = 'block';
    recentlyPlayed.style.display = 'block';
    document.getElementById('lyrics-container').style.display = 'block';
}

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
    sliderContainer.style.display = 'none';
    document.getElementById('lyrics-container').style.display = 'none';
});

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
                document.getElementById('song-title').innerHTML = `<a href="${data.item.external_urls.spotify}" target="_blank">${songTitle}</a>`;
                document.getElementById('artist-name').innerHTML = `<span class="artist-name">${data.item.artists.map(artist => artist.name).join(', ')}</span>`;
                document.getElementById('album-cover').src = data.item.album.images[0].url;
                fetchLyrics(songTitle, artistName);

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

async function fetchRecentSongs(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/recently-played', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            recentSongsList.innerHTML = '';
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

async function fetchLyrics(songTitle, artistName) {
    try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${artistName}/${songTitle}`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('lyrics').textContent = data.lyrics || 'Lyrics not found.';
        } else {
            console.error('Failed to fetch lyrics:', response.statusText);
            document.getElementById('lyrics').textContent = 'Lyrics not found.';
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        document.getElementById('lyrics').textContent = 'Lyrics not available.';
    }
}

function updateTimeDisplays(currentTime, totalTime) {
    currentTimeDisplay.textContent = formatTime(currentTime);
    totalTimeDisplay.textContent = formatTime(totalTime);
}

function formatTime(milliseconds) {
    const minutes = Math.floor((milliseconds / 1000) / 60);
    const seconds = Math.floor((milliseconds / 1000) % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}
