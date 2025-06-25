export const generateContent = async (prompt: string) => {
    const apiKey = import.meta.env.VITE_LLM_API_KEY;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [
            {
                parts: [
                    { text: prompt },
                ],
            },
        ],
        generationConfig: {
            thinkingConfig: {
                thinkingBudget: -1,
                includeThoughts: true,
            }
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();

    /*
    // Access the generated text from response structure
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return generatedText || "";
    */

    const parts = data.candidates?.[0]?.content?.parts ?? [];

    // Separate thoughts and answer parts
    const thoughts = parts
        .filter((part: any) => part.thought)
        .map((part: any) => part.text)
        .join("\n");

    const answer = parts
        .filter((part: any) => !part.thought)
        .map((part: any) => part.text)
        .join("\n");

    return { thoughts, answer };
};
