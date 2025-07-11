import { useState, ChangeEvent } from "react";
import { generateContent } from "./Gemini";
import ReactMarkdown from "react-markdown";
import "./gem.css";

interface Message {
    type: "user" | "bot" | "system";
    message: string;
}

const SendToGem = () => {
    const [response, setResponse] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [recognizedJSON, setRecognizedJSON] = useState<string>("");  // Step 1 output
    const [editableJSON, setEditableJSON] = useState<string>("");      // User-edited JSON

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);

        try {
            const fileText = await file.text();

            const prompt = `
            This is the content of a .drawio ER diagram.
            
            Please analyze it and extract all relevant ERD components. Your task is to return a JSON object using the **following structure** with valid values only.
            
            \`\`\`ts
            interface ERModel {
              entities: Entity[];
              relationships: Relationship[];
              isa_relationships?: ISA[];
            }
            
            interface Entity {
              name: string;
              type: "strong" | "weak";
              attributes: Attribute[];
            }
            
            interface Attribute {
              name: string;
              type: "simple" | "composite" | "multivalued" | "derived";
              is_primary_key?: boolean;
              is_partial_key?: boolean;
              components?: string[]; // for composite only
            }
            
            interface Relationship {
              name: string;
              type: "regular" | "weak" | "identifying";
              entities: {
                entity: string;
                cardinality: "one" | "many";
                participation: "optional" | "total";
              }[];
              attributes?: Attribute[];
            }
            
            interface ISA {
              super_entity: string;
              sub_entities: string[];
            }
            \`\`\`
            
            Please return your answer as a valid JSON object using this format.
            
            Below is the content of the .drawio file:
            ${fileText}
            `.trim();


            console.log("Prompt length:", prompt.length);
            const res = await generateContent(prompt);
            const jsonText = extractJSONFromText(res.answer);

            setRecognizedJSON(jsonText);
            setEditableJSON(jsonText);

            setResponse((prev) => [
                ...prev,
                { type: "user", message: `[Uploaded file: ${file.name}]` },
                { type: "bot", message: "Recognized JSON object displayed below. Please review/edit before generating SQL." },
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
        setIsLoading(true);
        try {
            const prompt = `
            The following is a user-edited JSON object representing entities, attributes, and relationships extracted from a .drawio ER diagram.
            Please generate SQL CREATE TABLE statements based on this structure. Provide a short explanation before the SQL.
            \n\n${editableJSON}
            `.trim();

            const res = await generateContent(prompt);

            setResponse((prev) => [
                ...prev,
                { type: "user", message: `[Generated SQL from edited JSON]` },
                { type: "bot", message: res.answer },
            ]);
        } catch (err) {
            console.error("Error generating SQL:", err);
            setResponse((prev) => [
                ...prev,
                { type: "system", message: "Failed to generate SQL from JSON." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const extractJSONFromText = (text: string): string => {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        return match ? match[1].trim() : text; // fallback if not wrapped in code block
    };

    const handleClear = () => {
        setResponse([]);
        setRecognizedJSON("");
        setEditableJSON("");
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
                    {isLoading && <p className="loading-text">Processing...</p>}
                </div>
            )}

            {recognizedJSON && (
                <div className="json-editor">
                    <h3>Edit Recognized JSON:</h3>
                    <textarea
                        value={editableJSON}
                        onChange={(e) => setEditableJSON(e.target.value)}
                        rows={20}
                        style={{ width: "100%", fontFamily: "monospace" }}
                    />
                    <button onClick={handleGenerateSQL} className="submit-btn">
                        Generate SQL from Edited JSON
                    </button>
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
            </div>
        </div>
    );
};

export default SendToGem;
