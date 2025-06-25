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

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);

        try {
            const fileText = await file.text(); // Read file content as text

            const prompt = `
            This is the content of a .drawio ER diagram.
            
            Please analyze the structure, explain step-by-step how you identified entities, attributes, and relationships, and then generate SQL CREATE TABLE statements based on it.
            
            Respond with your reasoning first, and SQL output after that.
            
            ${fileText}
            `.trim();


            const res = await generateContent(prompt);

            setResponse((prev) => [
                ...prev,
                { type: "user", message: `[Uploaded file: ${file.name}]` },
                { type: "bot", message: res },
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

    const handleClear = () => {
        setResponse([]);
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
