import { useRef, useState, useEffect, ChangeEvent } from "react";
import { io } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import Header from "./Header";
import "./gem.css";
import {
    GoogleGenAI,
    createUserContent,
    createPartFromUri,
} from "@google/genai";
import Save from "./Save.tsx";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation, useParams } from "react-router-dom";

interface Message {
    type: "user" | "bot" | "system" | "thinking";
    message: string;
}

const socket = io("http://localhost:3001", { withCredentials: true });
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_LLM_API_KEY });

const SessionImgToGem = () => {
    const { sessionID } = useParams();
    const [response, setResponse] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [responseString, setResponseString] = useState("");
    const [hostID, setHostID] = useState<string | null>(null);
    const { isAuthenticated, user, isLoading: authLoading } = useAuth0();
    const clientID = useRef<string | null | undefined>(null);
    const { state } = useLocation();
    const [isHost, setIsHost] = useState(false);
    const [hasJoinedSession, setHasJoinedSession] = useState(false);

    useEffect(() => {
        console.log("Debug info:", {
            isAuthenticated,
            authLoading,
            userSub: user?.sub,
            stateHostID: state?.hostID,
            hasJoinedSession
        });
    }, [isAuthenticated, authLoading, user?.sub, state?.hostID, hasJoinedSession]);

    useEffect(() => {
        if (user?.sub && state?.hostID) {
            setIsHost(user.sub === state.hostID);
        }
    }, [user, state]);

    useEffect(() => {
        // join session when authenticated
        if (!authLoading && isAuthenticated && user?.sub && !hasJoinedSession) {
            console.log("Attempting to join session with:", {
                sessionID,
                hostID: user.sub,
                stateHostID: state?.hostID
            });

            socket.emit("join-session", {
                sessionID,
                hostID: user.sub
            });
            setHasJoinedSession(true);
        }
    }, [authLoading, isAuthenticated, user?.sub, sessionID, hasJoinedSession, state?.hostID]);

    useEffect(() => {
        socket.on("connect", () => {
            clientID.current = socket.id;
            console.log("Socket connected:", socket.id);

            // reset the join flag when socket reconnects
            setHasJoinedSession(false);
        });

        // listen for session info from server
        socket.on("session-info", ({ hostID: serverHostID }) => {
            console.log("Received session info, hostID:", serverHostID);
            setHostID(serverHostID);
        });

        socket.on("receive-update", ({ fileName, responseText }) => {
            setResponse([
                { type: "user", message: `[Uploaded file: ${fileName}]` },
                { type: "bot", message: responseText },
            ]);
            setFile(null);
            setResponseString(responseText);
        });

        socket.on("image-cleared", () => {
            setResponse([]);
            setFile(null);
            setResponseString("");
            setIsLoading(false);
        });

        return () => {
            socket.off("connect");
            socket.off("receive-update");
            socket.off("image-cleared");
            socket.off("session-info");
        };
    }, []);

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !isHost) return;

        setFile(file);
        setIsLoading(true);

        try {
            const myfile = await ai.files.upload({
                file,
                config: { mimeType: "image/jpeg" },
            });

            const gemResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: createUserContent([
                    createPartFromUri(myfile.uri!, myfile.mimeType!),
                    "Convert this ERD image into SQL code. Use rules from Chen or Crow's Foot. Don't guess keys unless underlined.",
                ]),
            });

            const resText = gemResponse.text ?? "No bot response available";

            setResponse([
                { type: "user", message: `[Uploaded file: ${file.name}]` },
                { type: "bot", message: resText },
            ]);
            setResponseString(resText);

            socket.emit("update", {
                sessionID,
                fileName: file.name,
                responseText: resText,
            });
        } catch (err) {
            console.error("Gemini error:", err);
            setResponse([{ type: "system", message: "Failed to read or process the file." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        if (!isHost) return;

        setResponse([]);
        setFile(null);
        setResponseString("");
        setIsLoading(false);

        socket.emit("clear-image", sessionID);
    };

    if (authLoading) {
        return (
            <>
                <Header />
                <div className="chat-container">
                    <h1>Loading authentication...</h1>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="chat-container">
                <h3 className="text-center text-gray-500">Session ID: {sessionID}</h3>
                <h3 className="text-center text-gray-500">
                    Host ID: {hostID ? hostID.slice(-8).toUpperCase() : 'Loading...'}
                </h3>
                {isHost && <h4 className="text-center text-green-500">You are the host</h4>}

                {response.length === 0 ? (
                    <h1>Waiting for image upload...</h1>
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

                    {isHost && (
                        <button onClick={handleClear} className={`clear-btn  ${!isHost ? "opacity-50 cursor-not-allowed" : ""}`} disabled={!isHost}>
                            Clear
                        </button>
                    )}

                    {file && responseString && isAuthenticated && (
                        <button className="cursor-pointer clear-btn">
                            <Save file={file} responseText={responseString} />
                        </button>
                    )}

                    {isHost && (
                        <input
                            type="file"
                            accept=".png,.jpg"
                            onChange={handleFileUpload}
                            className={`chat-input ${!isHost ? "opacity-50 cursor-not-allowed" : ""}`}
                            disabled={!isHost}
                        />
                    )}

                </div>
            </div>
        </>
    );
};

export default SessionImgToGem;