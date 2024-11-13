const API_URL = "https://confused-cold-territory.glitch.me";

document.getElementById("login").addEventListener("click", () => {
    window.location.href = `${API_URL}/auth/spotify`;
});

window.addEventListener("load", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");

    if (accessToken) {
        localStorage.setItem("access_token", accessToken);

        try {
            const response = await fetch(`${API_URL}/spotify/user-data`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            });
            const userData = await response.json();

            if (response.ok) {
                alert(`Welcome, ${userData.displayName || userData.display_name}!`);
                localStorage.setItem("userProfile", JSON.stringify(userData));
            } else {
                console.error("Failed to retrieve user data:", userData.message);
                alert("Failed to retrieve user data. Please try again.");
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            alert("Error fetching user data. Please check the console for details.");
        }
    } else {
        console.log("No access token found in the URL.");
    }
});
