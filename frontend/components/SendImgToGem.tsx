import { useState, ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
import "./gem.css";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

// Message type definition
interface Message {
    type: "user" | "bot" | "system";
    message: string;
}
const ai = new GoogleGenAI({ apiKey: "AIzaSyCRBP9yA8mavdaepsouEfpElGCnUIOu4_M" });


const SendImgToGem = () => {
    const [response, setResponse] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);


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
      "I am providing you with a conceptual Entity-Relationship diagram that is in either Chen or Crow's Foot notation. " +
      "Return that diagram translated into SQL code. " +
      "Look at the lines between relationships and tables, and build extra tables if those lines have the features of a many-to-many relationship in either notation. " +
      "Do not make assumptions about relationships or attributes based on names, solely consider the picture. " +
      "Remember that in Chen notation, a 1 cardinality means one, and a letter cardinality means many, so 1 to M is one-to-many. " +
      "Also remember that primary keys are signified by underlined text, and partial keys are signified by text underlined with a dashed line. Do not assume anything is a primary or partial key unless it is underlined. ",
    ]),
  });
  setResponse((prev) => [
                ...prev,
                { type: "user", message: `[Uploaded file: ${file.name}]` },
                { type: "bot", message: response.text!.toString() },
            ]);
        
  console.log(response.text);
    }
  
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
                    accept=".png,.jpg"
                    onChange={handleFileUpload}
                    className="chat-input"
                />
            </div>
        </div>
    );
};

export default SendImgToGem;
