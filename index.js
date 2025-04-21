const express = require("express");
const axios = require("axios");
const { ANIME } = require("@consumet/extensions");
const { compareTwoStrings } = require("string-similarity");

const app = express();
const PORT = process.env.PORT || 3000;

const kaianime = new ANIME.AnimeKai();

// Function to map AniList title to KaiAnime ID
async function getMappings(title) {
  if (!title || !title.english || !title.romaji) return null;

  const eng = await kaianime.search(title.english);
  const rom = await kaianime.search(title.romaji);

  const combined = [...(eng?.results || []), ...(rom?.results || [])];
  const uniqueResults = Array.from(new Set(combined.map(item => JSON.stringify(item))))
    .map(item => JSON.parse(item));

  let highestComp = 0;
  let bestMatch = null;

  uniqueResults.forEach(obj => {
    const engScore = compareTwoStrings(title.english, obj.title || "");
    const jpScore = compareTwoStrings(title.romaji, obj.japaneseTitle || "");
    const score = Math.max(engScore, jpScore);

    if (score > highestComp) {
      highestComp = score;
      bestMatch = obj;
    }
  });

  return bestMatch;
}

// API route
app.get("/api/map/:anilistId", async (req, res) => {
  const { anilistId } = req.params;

  try {
    // Get AniList data using AniList GraphQL API
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          title {
            romaji
            english
          }
        }
      }
    `;

    const response = await axios.post("https://graphql.anilist.co", {
      query,
      variables: { id: Number(anilistId) },
    });

    const title = response.data.data.Media.title;
    const kaiResult = await getMappings(title);

    if (kaiResult) {
      res.json(kaiResult);
    } else {
      res.status(404).json({ error: "No match found on KaiAnime." });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    
