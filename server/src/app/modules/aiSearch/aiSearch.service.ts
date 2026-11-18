import prisma from "../../config/prisma";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const CAIMEX_BASE_URL =
  process.env.CAIMEX_BASE_URL || "https://api.caimex.ai/v1";
const CAIMEX_MODEL = process.env.CAIMEX_MODEL || "caimex/auto";

// Call Gemini (Google AI Studio key) via the standard generateContent API.
async function generateGemini(prompt: string, budgetMs = 12000): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const response = await fetch(
    `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: AbortSignal.timeout(budgetMs),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((part: any) => part.type === "text" || typeof part.text === "string")
    .map((part: any) => part.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
}

// Fallback AI provider: Caimex (OpenAI-compatible chat completions).
async function generateCaimex(prompt: string, budgetMs = 15000): Promise<string> {
  const apiKey = process.env.CAIMEX_API_KEY || "";
  if (!apiKey) {
    throw new Error("CAIMEX_API_KEY is not set");
  }

  const response = await fetch(`${CAIMEX_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CAIMEX_MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(budgetMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Caimex API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  if (!text) {
    throw new Error("Caimex returned an empty response");
  }
  return text;
}

// AI text generation with a provider chain: Gemini → Caimex.
async function generateText(prompt: string): Promise<string> {
  const errors: string[] = [];
  for (const provider of [generateGemini, generateCaimex]) {
    try {
      return await provider(prompt);
    } catch (error: any) {
      errors.push(error?.message || String(error));
    }
  }
  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
}

const aiSearchItems = async (searchQuery: string) => {
  console.log("User search:", searchQuery);
  try {
    // Fetch found items
    const foundItems = await prisma.foundItem.findMany({
      where: { isDeleted: false, isClaimed: false },
      include: {
        category: true,
        user: { select: { id: true, username: true, email: true } },
      },
    });

    // Fetch lost items
    const lostItems = await prisma.lostItem.findMany({
      where: { isDeleted: false, isFound: false },
      include: {
        category: true,
        user: { select: { id: true, username: true, email: true } },
      },
    });

    // Simplify data
    const foundItemsData = foundItems.map((item) => ({
      id: item.id,
      name: item.foundItemName,
      description: item.description,
      category: item.category?.name || "",
      location: item.location,
      date: item.date,
    }));

    const lostItemsData = lostItems.map((item) => ({
      id: item.id,
      name: item.lostItemName,
      description: item.description,
      category: item.category?.name || "",
      location: item.location,
      date: item.date,
    }));

    const prompt = `
    You are an AI assistant helping people find lost and found items.

    User search query: "${searchQuery}"

    Found items database:
    ${JSON.stringify(foundItemsData, null, 2)}

    Lost items database:
    ${JSON.stringify(lostItemsData, null, 2)}

    Please analyze the search query and return the most relevant items from both databases that match the search query.
    Consider keywords in the item name, description, category, and location.

    Return your response as a JSON object with this exact structure:
    {
      "matches": {
        "foundItems": [array of matching found item IDs],
        "lostItems": [array of matching lost item IDs]
      },
      "reasoning": "Brief explanation of why these items match"
    }

    Only return the JSON object, no additional text.
    `;

    let aiResponse = (await generateText(prompt)).trim();

    aiResponse = aiResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let aiResult;
    try {
      aiResult = JSON.parse(aiResponse);
    } catch (error) {
      console.error("Error parsing AI response:", error, aiResponse);
      return performSimpleSearch(searchQuery, foundItems, lostItems);
    }

    // Filter matched items
    const matchedFoundItems = foundItems.filter((item) =>
      aiResult.matches.foundItems.includes(item.id)
    );
    const matchedLostItems = lostItems.filter((item) =>
      aiResult.matches.lostItems.includes(item.id)
    );

    return {
      foundItems: matchedFoundItems,
      lostItems: matchedLostItems,
      reasoning: aiResult.reasoning,
      totalFound: matchedFoundItems.length,
      totalLost: matchedLostItems.length,
    };
  } catch (error) {
    console.error("AI Search Error:", error);
    // fallback to simple search
    const foundItems = await prisma.foundItem.findMany({
      where: { isDeleted: false, isClaimed: false },
      include: {
        category: true,
        user: { select: { id: true, username: true, email: true } },
      },
    });

    const lostItems = await prisma.lostItem.findMany({
      where: { isDeleted: false, isFound: false },
      include: {
        category: true,
        user: { select: { id: true, username: true, email: true } },
      },
    });

    return performSimpleSearch(searchQuery, foundItems, lostItems);
  }
};

// Fallback simple search function
const performSimpleSearch = (
  searchQuery: string,
  foundItems: any[],
  lostItems: any[]
) => {
  const query = searchQuery.toLowerCase();
  // Split into meaningful keywords so partial queries still match
  const keywords = query
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);

  const scoreItem = (fields: string[]) => {
    const text = fields.filter(Boolean).join(" ").toLowerCase();
    // Full phrase match counts extra
    let score = text.includes(query) ? 100 : 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) score += 1;
    }
    return score;
  };

  const matchedFoundItems = foundItems
    .map((item) => ({
      item,
      score: scoreItem([
        item.foundItemName,
        item.description,
        item.category?.name,
        item.location,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  const matchedLostItems = lostItems
    .map((item) => ({
      item,
      score: scoreItem([
        item.lostItemName,
        item.description,
        item.category?.name,
        item.location,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  return {
    foundItems: matchedFoundItems,
    lostItems: matchedLostItems,
    reasoning: "Simple text-based search results",
    totalFound: matchedFoundItems.length,
    totalLost: matchedLostItems.length,
  };
};

export const aiSearchService = {
  aiSearchItems,
};
