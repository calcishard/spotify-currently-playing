const CLIENT_ID = '8af5d68c29394b498a58679e13e1d03b';
const REDIRECT_URI = 'https://spotistats.dev/'; // Ensure this matches your Spotify app settings
const SCOPES = 'user-read-currently-playing user-read-recently-played user-modify-playback-state';
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
const prevButton = document.getElementById('prev-button');
const playPauseButton = document.getElementById('play-pause-button');
const playPauseIcon = document.getElementById('play-pause-icon');
const nextButton = document.getElementById('next-button');

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
    window.location.href = authUrl;
    if (hash) {
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
    checkIfSongIsPlaying(accessToken);
    fetchInterval = setInterval(() => fetchCurrentlyPlaying(accessToken), 1000);
    recentSongsInterval = setInterval(() => fetchRecentSongs(accessToken), 1000);
    isSongPlaying = setInterval(() => checkIfSongIsPlaying(accessToken), 1000);
    sliderDisplay = setInterval(() => updateSongProgress(currentTime, duration), 1000);

    // Update UI
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

function updateSlider(playedPercentage) {
    const slider = document.getElementById("song-slider");
    // Update the CSS variable for played percentage
    slider.style.setProperty('--played-percentage', playedPercentage + '%');
}

// Example of how to call this function when you receive new song data
// Assuming you get the current time and duration of the song in seconds
function updateSongProgress(currentTime, duration) {
    if (duration > 0) {
        const playedPercentage = (currentTime / duration) * 100; // Calculate percentage
        updateSlider(playedPercentage); // Update slider
    }
}

// Logout functionality
logoutButton.addEventListener('click', () => {
    // Clear access token in JavaScript
    accessToken = null;
    clearInterval(fetchInterval);
    clearInterval(recentSongsInterval);
    clearInterval(isSongPlaying);

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
    currentlyPlaying.style.display = 'none';
    prevButton.style.display = 'none';
    nextButton.style.display = 'none';
    playPauseButton.style.display = 'none';

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

async function fetchCurrentlyPlaying(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.item) {
                displayCurrentlyPlaying(data); // Call function to display song info
                updateSongProgress(data.progress_ms / 1000, data.item.duration_ms / 1000); // Update song progress
                playPauseIcon.textContent = data.is_playing ? 'pause' : 'play_arrow'; // Update play/pause icon
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

function handleNoCurrentSong() {
    const storedSong = localStorage.getItem('currentlyPlaying');
    if (storedSong) {
        displayCurrentlyPlaying(JSON.parse(storedSong)); // Display stored song info
    } else {
        document.getElementById('song-title').textContent = 'No song playing';
        document.getElementById('artist-name').textContent = '';
        document.getElementById('album-cover').src = '';
        document.getElementById('lyrics').textContent = 'Lyrics not available.';
        sliderContainer.style.display = 'none';
        playPauseIcon.textContent = 'play_arrow'; // Ensure play icon is shown when no song is playing
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
                console.log('A song is currently playing:', data.item.name);
                // Update the play/pause button to show "pause"
                playPauseIcon.textContent = 'pause'; // Change icon to pause
            } else {
                console.log('No song is currently playing.');
                // Update the play/pause button to show "play"
                playPauseIcon.textContent = 'play_arrow'; // Change icon to play
            }
        } else {
            console.error('Error fetching currently playing song:', response.statusText);
            // Handle play/pause button state if there's an error
            playPauseIcon.textContent = 'play_arrow'; // Default to play
        }
    } catch (error) {
        console.error('Error checking if song is playing:', error);
        // Default to play if there's an error
        playPauseIcon.textContent = 'play_arrow'; // Default to play
    }
}

// Update the displayCurrentlyPlaying function to save song info to local storage
function displayCurrentlyPlaying(data) {
    // Ensure data is valid before accessing its properties
    if (!data || !data.item) {
        console.error("Invalid data received:", data);
        // Handle UI when there's no song playing
        return;
    }

    const songTitle = data.item.name || 'Unknown Title';
    const artistName = data.item.artists?.[0]?.name || 'Unknown Artist';
    const songUri = data.item.uri;

    // Set song title as a hyperlink
    document.getElementById('song-title').innerHTML = `<a href="${data.item.external_urls.spotify}" target="_blank">${songTitle}</a>`;
    document.getElementById('artist-name').innerHTML = `<span class="artist-name">${data.item.artists.map(artist => artist.name).join(', ')}</span>`;
    document.getElementById('album-cover').src = data.item.album.images[0]?.url || '';

    // Save song info to local storage
    localStorage.setItem('currentlyPlaying', JSON.stringify({
        title: songTitle,
        artist: artistName,
        uri: songUri,
        duration_ms: data.item.duration_ms,
        progress_ms: data.progress_ms
    }));

    // Update slider and time display
    const duration = data.item.duration_ms || 0;
    const progress = data.progress_ms || 0;
    songSlider.max = duration;
    songSlider.value = progress;

    updateTimeDisplays(progress, duration);
    sliderContainer.style.display = 'flex';

    // Fetch lyrics for the currently playing song
    fetchLyrics(songTitle, artistName); // Call this function to get lyrics
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
            // Check if lyrics exist in the response
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

// Play/Pause functionality
playPauseButton.addEventListener('click', async () => {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            playPauseIcon.textContent = 'pause'; // Change to pause icon
            // Retrieve the stored song and position
            const storedSong = JSON.parse(localStorage.getItem('currentlyPlaying'));
            if (storedSong) {
                // Seek to the stored position when playing
                await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${storedSong.position}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
            }
        } else {
            // Handle pause action
            await fetch('https://api.spotify.com/v1/me/player/pause', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            playPauseIcon.textContent = 'play_arrow'; // Change to play icon
        }

        // Refresh currently playing info after action
        fetchCurrentlyPlaying(accessToken);
    } catch (error) {
        console.error('Error toggling playback:', error);
    }
});


// Add event listeners for previous and next buttons
document.getElementById('prev-button').addEventListener('click', () => controlPlayback('previous'));
document.getElementById('next-button').addEventListener('click', () => controlPlayback('next'));

// Function to control playback for previous and next
async function controlPlayback(action) {
    const endpoint = `https://api.spotify.com/v1/me/player/${action}`;
    try {
        await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        fetchCurrentlyPlaying(accessToken); // Refresh song info after action
    } catch (error) {
        console.error(`Error with ${action} command:`, error);
    }
}

// Slider control to adjust song position
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
