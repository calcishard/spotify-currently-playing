// API URL for backend routes
const API_URL = "http://localhost:3000";

// Spotify login initiation
document.getElementById("login").addEventListener("click", () => {
    // Redirect user to Spotify for authorization
    window.location.href = `${API_URL}/auth/spotify`;
});

// After authorization, retrieve token from URL and store user profile data
window.addEventListener("load", async () => {
    // Check if access token is in URL (redirected after Spotify auth)
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");

    if (accessToken) {
        // Store the access token in local storage for future use
        localStorage.setItem("access_token", accessToken);

        // Fetch user profile data from backend, using the access token
        try {
            const response = await fetch(`${API_URL}/spotify/user-data`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`, // Send access token to the backend
                    "Content-Type": "application/json",
                },
            });
            const userData = await response.json();

            if (response.ok) {
                // Display user information or navigate to the main app
                alert(`Welcome, ${userData.displayName || userData.display_name}!`); // Adjust for possible casing
                localStorage.setItem("userProfile", JSON.stringify(userData));
                // Optionally redirect to the main application page after successful login
                // window.location.href = "main-app.html"; // Uncomment if you want to navigate
            } else {
                console.error("Failed to retrieve user data:", userData.message);
                alert("Failed to retrieve user data. Please try again.");
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            alert("Error fetching user data. Please check the console for details.");
        }
    } else {
        // Optionally handle the case where no access token is present
        console.log("No access token found in the URL.");
    }
});
