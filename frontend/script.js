const CLIENT_ID = '8af5d68c29394b498a58679e13e1d03b';
const REDIRECT_URI = 'http://127.0.0.1:5500/frontend/index.html';
//http://127.0.0.1:5500/index.html
//https://spotistats.dev/
const SCOPES = 'user-read-currently-playing user-read-recently-played user-modify-playback-state';
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

function isMobileView() {
    return window.innerWidth <= 878; //mobile
}

// script.js

// Function to get the query parameters from the URL
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.slice(1);
    const regex = /([^&=]+)=([^&]*)/g;
    let m;

    while (m = regex.exec(queryString)) {
        params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }
    return params;
}

// Extract access token from the URL
const params = getQueryParams();
let accessToken = params.access_token;

if (accessToken) {
    // Store the access token in local storage
    localStorage.setItem('access_token', accessToken);
    console.log("Access Token:", accessToken);
    
    // Optionally: Call a function to fetch user data after storing the token
    fetchUserProfile(accessToken);
        //fetching data
    fetchCurrentlyPlaying(accessToken);
    fetchRecentSongs(accessToken);
    checkIfSongIsPlaying(accessToken);
    fetchInterval = setInterval(() => fetchCurrentlyPlaying(accessToken), 1000);
    recentSongsInterval = setInterval(() => fetchRecentSongs(accessToken), 1000);
    isSongPlaying = setInterval(() => checkIfSongIsPlaying(accessToken), 1000);

    if (isMobileView()) {
        document.getElementById('app').style.height = '150vh';
        lyricsTab.style.display = 'block';
        mobileLogoutButton.style.display = 'block';
        document.getElementById('current-info').style.width = '100%';
        document.getElementById('current-info').style.height = '100%';
        document.getElementById('welcome-container').style.display = 'none';
    }
} else {
    console.error("Access token not found in URL");
}

// Function to fetch user profile data from Spotify API
async function fetchUserProfile() {
    const token = localStorage.getItem('access_token');
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`, // Include the access token
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        console.log('User Profile:', data);
        // Handle user profile data here
    } catch (error) {
        console.error('Error fetching user profile:', error);
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
    console.log("hello");
    //clear access token
    accessToken = null;
    clearInterval(fetchInterval);
    clearInterval(recentSongsInterval);
    clearInterval(isSongPlaying);
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
        //handle UI when there's no song playing
        return;
    }

    const songTitle = data.item.name || 'Unknown Title';
    const artistName = data.item.artists?.[0]?.name || 'Unknown Artist';
    const songUri = data.item.uri;

    document.getElementById('song-title').innerHTML = `<a href="${data.item.external_urls.spotify}" target="_blank">${songTitle}</a>`;
    document.getElementById('artist-name').innerHTML = `<span class="artist">${artistName}</span>`;
    document.getElementById('album-cover').src = data.item.album.images[0].url;

    // Store currently playing song in localStorage
    localStorage.setItem('currentlyPlaying', JSON.stringify(data));
}

async function fetchRecentSongs(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/recently-played', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayRecentSongs(data.items);
        } else {
            console.error('Failed to fetch recently played songs:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching recently played songs:', error);
    }
}

function displayRecentSongs(songs) {
    recentSongsList.innerHTML = ''; // Clear existing songs
    songs.forEach(song => {
        const songElement = document.createElement('li');
        songElement.textContent = `${song.track.name} - ${song.track.artists[0].name}`;
        recentSongsList.appendChild(songElement);
    });
}

// Event listeners for play/pause and next/previous buttons
playPauseButton.addEventListener('click', async () => {
    if (accessToken) {
        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            if (response.ok) {
                // Update the icon to indicate the song is playing
                playPauseIcon.textContent = 'pause';
            } else {
                console.error('Error playing the song:', response.statusText);
            }
        } catch (error) {
            console.error('Error playing the song:', error);
        }
    }
});

// Fetch access token from backend when redirected
async function fetchAccessToken() {
    try {
        const response = await fetch('http://localhost:3000/auth/spotify/callback'); // Adjust the URL as necessary
        if (!response.ok) throw new Error('Failed to retrieve access token');

        const data = await response.json();
        accessToken = data.access_token; // Make sure the backend sends the access token in this format

        // Start fetching data
        fetchCurrentlyPlaying(accessToken);
        fetchRecentSongs(accessToken);
        checkIfSongIsPlaying(accessToken);
        fetchInterval = setInterval(() => fetchCurrentlyPlaying(accessToken), 1000);
        recentSongsInterval = setInterval(() => fetchRecentSongs(accessToken), 1000);
        isSongPlaying = setInterval(() => checkIfSongIsPlaying(accessToken), 1000);

        // Update UI
        updateUIAfterLogin();
    } catch (error) {
        console.error('Error fetching access token:', error);
    }
}

// Call the function to fetch the access token if on the main page
window.addEventListener('load', () => {
    if (window.location.pathname === '/frontend/main.html') { // Adjust this to match your actual path
        fetchAccessToken();
    }
});

// Logout function
function logout() {
    accessToken = null;
    window.location.hash = '';
    const logoutWindow = window.open('https://accounts.spotify.com/logout', '_blank');
    setTimeout(() => {
        logoutWindow.close();
        window.location.href = REDIRECT_URI; // Redirect
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
