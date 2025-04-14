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

async function getGameStats() {
  try {
    const response = await axios.get("https://api.balldontlie.io/v1/stats", {
      params: {
        "seasons[]": [2023],
        "player_ids[]": [246], // Nikola Jokic as an example
        per_page: 100,
      },
      headers: {
        Authorization: "b6dc962d-e53f-4659-a379-ec939aa673b9",
      },
    });

    // Transform the data into a table-friendly format
    const tableData = response.data.data.map((stat) => ({
      "Game ID": stat.game.id,
      Date: stat.game.date,
      Player: `${stat.player.first_name} ${stat.player.last_name}`,
      Team: stat.team.abbreviation,
      Opponent:
        stat.game.home_team_id === stat.team.id
          ? response.data.data.find(
              (s) =>
                s.game.id === stat.game.id &&
                s.team.id === stat.game.visitor_team_id
            )?.team.abbreviation
          : response.data.data.find(
              (s) =>
                s.game.id === stat.game.id &&
                s.team.id === stat.game.home_team_id
            )?.team.abbreviation,
      PTS: stat.pts,
      REB: stat.reb,
      AST: stat.ast,
      STL: stat.stl,
      BLK: stat.blk,
      "FG%": (stat.fg_pct * 100).toFixed(1),
      "3P%": (stat.fg3_pct * 100).toFixed(1),
      "FT%": (stat.ft_pct * 100).toFixed(1),
      MIN: stat.min,
      TOV: stat.turnover,
      PF: stat.pf,
    }));

    // Calculate averages
    const averages = {
      "Game ID": "AVERAGES",
      Date: "",
      Player: "",
      Team: "",
      Opponent: "",
      PTS: (
        tableData.reduce((sum, game) => sum + game.PTS, 0) / tableData.length
      ).toFixed(1),
      REB: (
        tableData.reduce((sum, game) => sum + game.REB, 0) / tableData.length
      ).toFixed(1),
      AST: (
        tableData.reduce((sum, game) => sum + game.AST, 0) / tableData.length
      ).toFixed(1),
      STL: (
        tableData.reduce((sum, game) => sum + game.STL, 0) / tableData.length
      ).toFixed(1),
      BLK: (
        tableData.reduce((sum, game) => sum + game.BLK, 0) / tableData.length
      ).toFixed(1),
      "FG%": (
        tableData.reduce((sum, game) => sum + parseFloat(game["FG%"]), 0) /
        tableData.length
      ).toFixed(1),
      "3P%": (
        tableData.reduce((sum, game) => sum + parseFloat(game["3P%"]), 0) /
        tableData.length
      ).toFixed(1),
      "FT%": (
        tableData.reduce((sum, game) => sum + parseFloat(game["FT%"]), 0) /
        tableData.length
      ).toFixed(1),
      MIN: (
        tableData.reduce((sum, game) => sum + parseFloat(game.MIN), 0) /
        tableData.length
      ).toFixed(1),
      TOV: (
        tableData.reduce((sum, game) => sum + game.TOV, 0) / tableData.length
      ).toFixed(1),
      PF: (
        tableData.reduce((sum, game) => sum + game.PF, 0) / tableData.length
      ).toFixed(1),
    };

    // Add averages to the table data
    const tableDataWithAverages = [...tableData, averages];

    // Display the table
    console.table(tableDataWithAverages);

    // Show metadata
    console.log("\nMetadata:");
    console.log("Total games:", tableData.length);
    console.log("Next cursor:", response.data.meta.next_cursor);
    console.log("Per page:", response.data.meta.per_page);
  } catch (error) {
    console.error("Error fetching stats:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Status:", error.response.status);
    }
  }
}

getAllTeams();
getGameStats();
