const axios = require("axios");

async function getAllTeams() {
  try {
    const response = await axios.get("https://api.balldontlie.io/v1/teams", {
      headers: {
        Authorization: "b6dc962d-e53f-4659-a379-ec939aa673b9", // Your API key
      },
    });

    // Log all teams
    console.log("All NBA Teams:");
    response.data.data.forEach((team) => {
      console.log(
        `ID: ${team.id}, Name: ${team.full_name}, Abbreviation: ${team.abbreviation}`
      );
    });

    // Find and log Charlotte Hornets specifically
    const hornets = response.data.data.find(
      (team) =>
        team.full_name === "Charlotte Hornets" || team.name === "Hornets"
    );
    console.log("\nCharlotte Hornets Details:");
    console.log(hornets);
  } catch (error) {
    console.error("Error fetching teams:", error.message);
  }
}

getAllTeams();
