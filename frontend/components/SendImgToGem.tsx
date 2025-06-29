import { useState, ChangeEvent } from "react";
//import { generateContent } from "./Gemini";
import ReactMarkdown from "react-markdown";
import Header from "./Header";
import "./gem.css";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
//import * as fs from "node:fs";
import Save from "./Save.tsx";

// Message type definition
interface Message {
    type: "user" | "bot" | "system" | "thinking";
    message: string;
}
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_LLM_API_KEY });
/*const base64 = (f: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(f);
    return new Promise((resolve, reject) =>{
        console.log(f.toString());
        reader.onload = () => {
                resolve(reader.result?.toString());
                reader.onerror = error => reject(error);
            }
        })
}*/

const SendImgToGem = () => {
    const [response, setResponse] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);
    const [responseString, setResponseString] = useState<string>("");

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {

        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);

        setIsLoading(true);

        if (e.target.files?.[0] != undefined) {
            const myfile = await ai.files.upload({
                file: e.target.files?.[0],
                config: {mimeType: "image/jpeg"},
            });

            if (myfile.uri != undefined && myfile.mimeType != undefined) {
                try {
                    const response = await ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: createUserContent([
                            createPartFromUri(myfile.uri, myfile.mimeType),
                            "What is this image showing?",
                        ]),
                    });

                    const text = response.text ?? "No response received.";
                    //console.log(text);

                    setResponse((prev) => [
                        ...prev,
                        {type: "bot", message: text}
                    ]);

                    const resStr = response.text ?? "No bot response available";
                    setResponseString(resStr);
                    setIsLoading(false);

                } catch (err) {
                    console.error("Gemini error:", err);
                    setResponse((prev) => [
                        ...prev,
                        {type: "system", message: "Failed to read or process the file."}
                    ]);
                }
            }
        }
    }

    const handleClear = () => {
        setResponse([]);
        setIsLoading(false);
        setFile(null);
        setResponseString("");
    };

    return (
        <>
            <Header />
            <div className="chat-container">
                {response.length === 0 ? (
                    <h1>Upload your image here</h1>
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

                    {file !== null && responseString !== "" && (
                        <button className="cursor-pointer clear-btn">
                            <Save file={file} responseText={responseString} />
                        </button>
                    )}

                    <input
                        type="file"
                        accept=".png,.jpg"
                        onChange={handleFileUpload}
                        className="chat-input"
                    />
                </div>
            </div>
        </>
    );
};

export default SendImgToGem;
