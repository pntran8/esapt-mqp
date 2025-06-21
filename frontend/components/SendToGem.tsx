import { useState, ChangeEvent, KeyboardEvent } from "react";
import { IoIosSend } from "react-icons/io";
import { generateContent } from "./Gemini";
import ReactMarkdown from "react-markdown";
import "./gem.css";

// Message type definition
interface Message {
    type: "user" | "bot" | "system";
    message: string;
}

const SendToGem = () => {
    const [userInput, setUserInput] = useState<string>("");
    const [response, setResponse] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleUserInput = (e: ChangeEvent<HTMLInputElement>) => {
        setUserInput(e.target.value);
    };

    const handleClear = () => {
        setUserInput("");
        setResponse([]);
        setIsLoading(false);
    };

    const handleSubmit = async () => {
        if (!userInput.trim()) {
            setResponse([{ type: "system", message: "Please enter a prompt.." }]);
            return;
        }

        setIsLoading(true);
        try {
            const res = await generateContent(userInput); // res is string
            setResponse((prevResponse) => [
                ...prevResponse,
                { type: "user", message: userInput },
                { type: "bot", message: res },
            ]);
            setUserInput("");
        } catch (err) {
            console.error("Error generating response:", err);
            setResponse((prevResponse) => [
                ...prevResponse,
                { type: "system", message: "Failed to generate response" },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
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
                    type="text"
                    value={userInput}
                    onChange={handleUserInput}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message here..."
                    className="chat-input"
                />

                <button onClick={handleSubmit} className="send-btn">
                    <IoIosSend />
                </button>
            </div>
        </div>
    );
};

export default SendToGem;
