const CLIENT_ID = '8af5d68c29394b498a58679e13e1d03b';
const REDIRECT_URI = 'https://spotistats.dev/';
//http://127.0.0.1:5500/index.html
//https://spotistats.dev/
const SCOPES = 'user-read-currently-playing user-read-recently-played user-modify-playback-state';
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
const mobileLogoutButton = document.getElementById('mobile-logout');
const lyricsTab = document.getElementById('lyrics-tab');
const prevButton = document.getElementById('prev-button');
const playPauseButton = document.getElementById('play-pause-button');
const playPauseIcon = document.getElementById('play-pause-icon');
const nextButton = document.getElementById('next-button');
const sidebarButton = document.getElementById('sidebar-button');

logoutButton.style.display = 'none';
songInfo.style.display = 'none';
recentlyPlayed.style.display = 'none';

function isMobileView() {
    return window.innerWidth <= 878; //mobile
}

//login
const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPES}&response_type=token`;
loginButton.addEventListener('click', () => {
    window.location.href = authUrl;
    if (hash) {
        loginWindow.close();
        window.location.href = authUrl;
    }
});

const hash = window.location.hash;
if (hash.includes("access_token")) {
    const params = new URLSearchParams(hash.substring(1));
    accessToken = params.get('access_token');

    window.history.replaceState({}, document.title, REDIRECT_URI);

    //fetching data
    fetchCurrentlyPlaying(accessToken);
    fetchRecentSongs(accessToken);
    checkIfSongIsPlaying(accessToken);
    fetchInterval = setInterval(() => fetchCurrentlyPlaying(accessToken), 1000);
    recentSongsInterval = setInterval(() => fetchRecentSongs(accessToken), 1000);
    isSongPlaying = setInterval(() => checkIfSongIsPlaying(accessToken), 1000);

    //update UI
    loginButton.style.display = 'none';
    logoutButton.style.display = 'block';
    songInfo.style.display = 'block';
    recentlyPlayed.style.display = 'block';
    document.getElementById('lyrics-container').style.display = 'block';
    currentlyPlaying.style.display = 'block';
    document.getElementById('welcome-container').style.display = 'none';
    prevButton.style.display = 'block';
    nextButton.style.display = 'block';
    playPauseButton.style.display = 'block';

    if (isMobileView()) {
        document.getElementById('app').style.height = '150vh';
        lyricsTab.style.display = 'block';
        mobileLogoutButton.style.display = 'block';
        document.getElementById('current-info').style.width = '100%';
        document.getElementById('current-info').style.height = '100%';
        document.getElementById('welcome-container').style.display = 'none';
    }
}

async function refreshAccessToken(refreshToken) {
    try {
        const response = await fetch('http://localhost:3000/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        accessToken = data.accessToken;
        console.log('New access token:', accessToken);
    } catch (error) {
        console.error('Error refreshing access token:', error);
    }
}

function updateSlider(playedPercentage) {
    const slider = document.getElementById("song-slider");
    slider.style.setProperty('--played-percentage', playedPercentage + '%');
}

//logout
function logout() {
    //clear access token
    accessToken = null;
    clearInterval(fetchInterval);
    clearInterval(recentSongsInterval);
    clearInterval(isSongPlaying);

    //clear UI
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
    lyricsTab.style.display = 'none';
    mobileLogoutButton.style.display = 'none';
    prevButton.style.display = 'none';
    nextButton.style.display = 'none';
    playPauseButton.style.display = 'none';

    if (isMobileView()) {
        document.getElementById('app').style.height = '100vh';
    }

    //remove access token
    window.location.hash = '';

    const logoutWindow = window.open('https://accounts.spotify.com/logout', '_blank');
    setTimeout(() => {
        logoutWindow.close();
        window.location.href = REDIRECT_URI; //redirect
    }, 1000);
}

logoutButton.addEventListener('click', logout);
mobileLogoutButton.addEventListener('click', logout);


async function fetchCurrentlyPlaying(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.item) {
                displayCurrentlyPlaying(data); //display song info
                updateSongProgress(data.progress_ms / 1000, data.item.duration_ms / 1000); //song progress
                playPauseIcon.textContent = data.is_playing ? 'pause' : 'play_arrow'; //play and pause icon
            } else {
                handleNoCurrentSong();
            }
        } else {
            console.error('Failed to fetch currently playing song:', response.statusText);
            handleNoCurrentSong();
        }
    } catch (error) {
        console.error('Error fetching currently playing song:', error);
        handleNoCurrentSong();
    }
}

//update song slider
function updateSongProgress(currentTime, duration) {
    if (duration > 0) {
        const playedPercentage = (currentTime / duration) * 100;
        updateSlider(playedPercentage);
    }
}

function handleNoCurrentSong() {
    const storedSong = localStorage.getItem('currentlyPlaying');
    if (storedSong) {
        displayCurrentlyPlaying(JSON.parse(storedSong));
    } else {
        document.getElementById('song-title').textContent = 'No song playing';
        document.getElementById('artist-name').textContent = '';
        document.getElementById('album-cover').src = '';
        document.getElementById('lyrics').textContent = 'Lyrics not available.';
        sliderContainer.style.display = 'none';
        playPauseIcon.textContent = 'play_arrow';
    }
}

async function checkIfSongIsPlaying(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.is_playing) {
                playPauseIcon.textContent = 'pause';
            } else {
                playPauseIcon.textContent = 'play_arrow';
            }
        } else {
            console.error('Error fetching currently playing song:', response.statusText);
            playPauseIcon.textContent = 'play_arrow';
        }
    } catch (error) {
        console.error('Error checking if song is playing:', error);
        playPauseIcon.textContent = 'play_arrow';
    }
}

function displayCurrentlyPlaying(data) {
    if (!data || !data.item) {
        console.error("Invalid data received:", data);
        //handle UI when theres no song playing
        return;
    }

    const songTitle = data.item.name || 'Unknown Title';
    const artistName = data.item.artists?.[0]?.name || 'Unknown Artist';
    const songUri = data.item.uri;

    document.getElementById('song-title').innerHTML = `<a href="${data.item.external_urls.spotify}" target="_blank">${songTitle}</a>`;
    document.getElementById('artist-name').innerHTML = `<span class="artist-name">${data.item.artists.map(artist => artist.name).join(', ')}</span>`;
    document.getElementById('album-cover').src = data.item.album.images[0]?.url || '';

    //save song info to local storage
    localStorage.setItem('currentlyPlaying', JSON.stringify({
        title: songTitle,
        artist: artistName,
        uri: songUri,
        duration_ms: data.item.duration_ms,
        progress_ms: data.progress_ms
    }));

    //update slider and time display
    const duration = data.item.duration_ms || 0;
    const progress = data.progress_ms || 0;
    songSlider.max = duration;
    songSlider.value = progress;

    updateTimeDisplays(progress, duration);
    sliderContainer.style.display = 'flex';

    //fetch lyrics for the currently playing song
    fetchLyrics(songTitle, artistName);
}

//fetch recently played songs
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

//fetch lyrics for the currently playing song
async function fetchLyrics(songTitle, artistName) {
    try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${artistName}/${songTitle}`);
        if (response.ok) {
            const data = await response.json();
            if (data.lyrics) {
                document.getElementById('lyrics').textContent = data.lyrics;
            } else {
                document.getElementById('lyrics').textContent = 'Lyrics not found.';
            }
            if (isMobileView()) {
                document.getElementById('app').style.height = '150vh';
            }
        } else {
            console.error('Failed to fetch lyrics:', response.status, response.statusText);
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

//play and pause button
playPauseButton.addEventListener('click', async () => {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            playPauseIcon.textContent = 'pause'; //change to pause icon
            //retrieve the stored song and position
            const storedSong = JSON.parse(localStorage.getItem('currentlyPlaying'));
            if (storedSong) {
                await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${storedSong.position}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
            }
        } else {
            //handle pause action
            await fetch('https://api.spotify.com/v1/me/player/pause', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            playPauseIcon.textContent = 'play_arrow';
        }

        //refresh currently playing info after action
        fetchCurrentlyPlaying(accessToken);
    } catch (error) {
        console.error('Error toggling playback:', error);
    }
});

document.getElementById('prev-button').addEventListener('click', () => controlPlayback('previous'));
document.getElementById('next-button').addEventListener('click', () => controlPlayback('next'));

//control playback for previous and next
async function controlPlayback(action) {
    const endpoint = `https://api.spotify.com/v1/me/player/${action}`;
    try {
        await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        fetchCurrentlyPlaying(accessToken); //refresh song info
    } catch (error) {
        console.error(`Error with ${action} command:`, error);
    }
}

//control to adjust song position
songSlider.addEventListener('input', async () => {
    const newPosition = songSlider.value;
    try {
        await fetch('https://api.spotify.com/v1/me/player/seek?position_ms=' + newPosition, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
    } catch (error) {
        console.error('Error updating song position:', error);
    }
});

//time displays
function updateTimeDisplays(currentTime, totalTime) {
    currentTimeDisplay.textContent = formatTime(currentTime);
    totalTimeDisplay.textContent = formatTime(totalTime);
}

//time in mm:ss
function formatTime(milliseconds) {
    const minutes = Math.floor((milliseconds / 1000) / 60);
    const seconds = Math.floor((milliseconds / 1000) % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

document.getElementById("lyrics-tab").addEventListener("click", function() {
    document.getElementById("lyrics-container").scrollIntoView({ behavior: "smooth" });
});
