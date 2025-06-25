import { useState, ChangeEvent } from "react";
import { generateContent } from "./Gemini";
import ReactMarkdown from "react-markdown";
import "./gem.css";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import * as fs from "node:fs";

// Message type definition
interface Message {
    type: "user" | "bot" | "system";
    message: string;
}
const ai = new GoogleGenAI({ apiKey: "AIzaSyCRBP9yA8mavdaepsouEfpElGCnUIOu4_M" });
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

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);

       // try {
            
            /*const fileText = await base64(file)
            console.log(fileText)
            //const fileText = await file.text(); // Read file content as text

            const prompt = `
            The following is base64 text of a JPEG. Convert it to an image and tell me what it is.
            
            ${fileText}
            `.trim();

            console.log("oops, nothing read");
            const res = await generateContent(prompt);

            setResponse((prev) => [
                ...prev,
                { type: "user", message: `[Uploaded file: ${file.name}]` },
                { type: "bot", message: res },
            ]);*/
            if (e.target.files?.[0] != undefined){
                
            const myfile = await ai.files.upload({
    file: e.target.files?.[0],
    config: { mimeType: "image/jpeg" },
  });

  if (myfile.uri != undefined && myfile.mimeType != undefined){
    
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([
      createPartFromUri(myfile.uri, myfile.mimeType),
      "What is this image showing?",
    ]),
  });
  console.log(response.text);
    }
  
}
        /*} catch (err) {
            console.error("Error reading file:", err);
            setResponse((prev) => [
                ...prev,
                { type: "system", message: "Failed to read or process the file." },
            ]);
        } finally {
            setIsLoading(false);
        }
*/    };
    
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
                    accept=".png,.jpg"
                    onChange={handleFileUpload}
                    className="chat-input"
                />
            </div>
        </div>
    );
};

export default SendImgToGem;
