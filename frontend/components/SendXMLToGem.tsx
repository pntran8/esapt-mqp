import { useState, ChangeEvent } from "react";
import { generateContent } from "./Gemini";
import ReactMarkdown from "react-markdown";
import "./gem.css";

// Message type definition
interface Message {
    type: "user" | "bot" | "system";
    message: string;
}

const SendToGem = () => {
    const [response, setResponse] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [parsedOutput, setParsedOutput] = useState<string>("");
    const [editableJson, setEditableJson] = useState<string>("");


    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);

        try {
            const fileText = await file.text(); // Read file content as text

            const prompt =
            `This is the content of a .drawio ER diagram.
            
            Please analyze the structure and return a JSON object with the following format:
            
            {
              "entities": [
                {
                  "name": "EntityName",
                  "attributes": ["attr1", "attr2", "attr3"]
                },
                ...
              ],
              "relationships": [
                {
                  "from": "EntityA",
                  "to": "EntityB",
                  "type": "one-to-many" | "many-to-many" | "one-to-one",
                  "label": "RelationshipLabel"
                },
                ...
              ]
            }
            
            Respond only with valid JSON and no explanation.
            
            ${fileText}
            `.trim();


            const parsed = await generateContent(prompt);
            setParsedOutput(parsed);
            setEditableJson(parsed);

            setResponse((prev) => [
                ...prev,
                { type: "user", message: `[Uploaded file: ${file.name}]` },
                { type: "bot", message: `**Parsed Structure:**\n\`\`\`json\n${parsed}\n\`\`\`` },
            ]);
        } catch (err) {
            console.error("Error reading file:", err);
            setResponse((prev) => [
                ...prev,
                { type: "system", message: "Failed to read or process the file." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };
    const handleGenerateSQL = async () => {
        if (!editableJson) return;

        setIsLoading(true);
        try {
            const prompt = `
            You are given a JSON description of entities and relationships from an ER diagram.
            
            Please generate SQL CREATE TABLE statements based on it. Consider foreign key constraints where applicable.
            
            JSON:
            ${editableJson}
            `.trim();

            const sql = await generateContent(prompt);

            setResponse((prev) => [
                ...prev,
                { type: "user", message: `[Generate SQL]` },
                { type: "bot", message: `**Generated SQL:**\n\`\`\`sql\n${sql}\n\`\`\`` },
            ]);
        } catch (err) {
            console.error("Error generating SQL:", err);
            setResponse((prev) => [
                ...prev,
                { type: "system", message: "Failed to generate SQL." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };
    const handleClear = () => {
        setResponse([]);
        setParsedOutput("");
        setEditableJson("");
        setIsLoading(false);
    };

    return (
        <div className="chat-container">
            {response.length === 0 ? (
                <h1>Got Questions? Chatty's Got Answers.</h1>
            ) : (
                <div className="chat-history">
                    {response.map((msg, index) => (
                        <div key={index} className={`message ${msg.type}`}>
                            <ReactMarkdown>{msg.message}</ReactMarkdown>
                        </div>
                    ))}
                    {isLoading && <p className="loading-text">Generating response...</p>}
                </div>
            )}
            {parsedOutput && (
                <div className="json-editor">
                    <h3>Edit Parsed JSON:</h3>
                    <textarea
                        value={editableJson}
                        onChange={(e) => setEditableJson(e.target.value)}
                        rows={20}
                        cols={80}
                        className="json-textarea"
                    />
                </div>
            )}

            <div className="input-container">
                <button onClick={handleClear} className="clear-btn">
                    Clear
                </button>

                <input
                    type="file"
                    accept=".drawio,.xml"
                    onChange={handleFileUpload}
                    className="chat-input"
                />
                <button onClick={handleGenerateSQL} className="generate-btn" disabled={!parsedOutput || isLoading}>
                    Generate SQL
                </button>
            </div>
        </div>
    );
};

export default SendToGem;
