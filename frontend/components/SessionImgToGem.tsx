import { useRef, useState, useEffect, ChangeEvent } from "react";
import { io } from "socket.io-client";
import Header from "./Header";
import "./gem.css";
import {
    GoogleGenAI,
    createUserContent,
    createPartFromUri,
} from "@google/genai";
import Save from "./Save.tsx";
import { useAuth0 } from "@auth0/auth0-react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import download from "../src/assets/download.png";
import * as React from "react";
import Footer from "./Footer.tsx";



interface Message {
    type: "user" | "bot" | "system" | "thinking";
    message: string;
}

interface Props {
    code: string;
    setCode: (code: string) => void;
    setExplanation: (exp: string) => void;
    imageUrl: string | null;
    setImageUrl: (url: string) => void;
}

const socket = io("http://localhost:3001", { withCredentials: true });
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_LLM_API_KEY });

const SessionImgToGem:React.FC<Props> = ({ imageUrl, setImageUrl, code, setCode, setExplanation }) => {
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
    const navigate = useNavigate();

    const goToHistory = () => {
        navigate('/viewHistory');
    }
    const goToExp = () => {
        //console.log(code);
        //console.log(explanation);
        navigate("/explanation");
    }

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

        socket.on("receive-update", ({ fileName, responseText, code, explanation }) => {
            setResponse([
                { type: "user", message: `[Uploaded file: ${fileName}]` },
                { type: "bot", message: code },
            ]);
            setCode(code);
            setExplanation(explanation);
            setResponseString(responseText);
        });

        socket.on("image-cleared", () => {
            setResponse([]);
            setFile(null);
            setResponseString("");
           // setIsLoading(false);
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
        setIsLoading(true);
        setFile(file);
        const localUrl = URL.createObjectURL(file);
        setImageUrl(localUrl);

        let resStr = "";

        try {
            const myfile = await ai.files.upload({
                file,
                config: { mimeType: "image/jpeg" },
            });

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: createUserContent([
                    createPartFromUri(myfile.uri!, myfile.mimeType!),
                    "I am providing you with a conceptual Entity-Relationship diagram that is in either Chen or Crow's Foot notation. " +
                    "Return that diagram translated into SQL code. " +
                    "Look at the lines between relationships and tables, and build extra tables if those lines have the features of a many-to-many relationship in either notation. " +
                    "Do not make assumptions about relationships or attributes based on names, solely consider the picture. " +
                    "Remember that in Chen notation, a 1 cardinality means one, and a letter cardinality means many, so 1 to M is one-to-many. Relationships are represented as diamonds, connected to the the entities they are relating." +
                    "Also remember that primary keys are signified by underlined text, and partial keys are signified by text underlined with a dashed line. " +
                    "Pay close attention to whether the text is underlined or not because the space between the text and underline may be small. " +
                    "Do not assume anything is a primary or partial key unless it is underlined. " +
                    "Do not create foreign keys or addtional tables unless there is a relationship between entities" +
                    "Print out the SQL code, then '----------' on a new line, then an explanation for the logic behind the code.",
                ]),
            });

            // const resText = gemResponse.text ?? "No bot response available";

            setResponse([
                { type: "user", message: `[Uploaded file: ${file.name}]` },
                { type: "bot", message: response.text!.split('----------')[0].toString() },
            ]);

            resStr = response.text ?? "No bot response available";
            const resParts = resStr.split('----------');
            setCode(resParts[0]);
            setExplanation(resParts[1]);
            //console.log(code);
            //console.log(explanation);
            setResponseString(resStr);

            socket.emit("update", {
                sessionID,
                fileName: file.name,
                responseText: resStr, // Send full response
                code: resParts[0],
                explanation: resParts[1],
                imageUrl: localUrl, // Send image URL (though this won't work cross-user)
            });
        } catch (err) {
            console.error("Gemini error:", err);
            setResponse([{ type: "system", message: "Failed to read or process the file." }]);
        } finally {
            //setIsLoading(false);
        }
    };

   /* const handleClear = () => {
        if (!isHost) return;

        setResponse([]);
        setFile(null);
        setResponseString("");
        setIsLoading(false);

        socket.emit("clear-image", sessionID);
    }; */

    if (authLoading) {
        return (
            <>
                <Header />
                <h1>Generate SQL from ERD</h1>
                <div className="chat-container">
                    <h1>Loading authentication...</h1>
                </div>
                <Footer />
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
            </div>
                <div id="input-container" style={{border:"1vh light grey", borderRadius:"2vh", marginTop:"3vh"}}>
                    <input
                        type="file"
                        accept=".png,.jpg"
                        onChange={handleFileUpload}
                        className="chat-input"
                        style={{fontSize:'2vh'}}
                    />
                </div>
            <div style={{height: '70vh', marginBottom: "1vh", marginTop: "3vh", display: 'flex', justifyContent: 'center', alignItems: 'stretch', gap: '4vh'}}>
                <div style={{width: '45vw', display: 'flex', flexDirection: 'column'}}>
                    <h2 style={{ fontSize: '2.5vh', margin: '0 0 1vh 0' }}>Your ERD is displayed here</h2>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="border-2 border-[#BD0A0A]">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="ERD Preview"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                }}
                            />
                        ) : (
                            <p>No image available.</p>
                        )}
                    </div>
                </div>

                <div className={"inner-page-box"} style={{width: '30vw', overflow: "scroll"}}>
                    {response.length === 0 ? (
                        isLoading ? (<h1 style={{fontSize:'max(15px, 2.5vh)'}}>Loading SQL, please wait...</h1>)
                            : (<h1 style={{fontSize:'max(15px, 2.5vh)'}}>Upload your image to see code</h1>)
                    ) : (
                        <div>
                            <h3 style={{fontSize:'20px', justifySelf:'left'}}>{code}</h3>
                        </div>
                    )}
                </div>
            </div>

                <div style={{height:'25vh', marginBottom:"6vh"}}>
                    <div className={"inner-page-box w-[35vw] h-[25vh] ml-[10vw] float-left"}>
                        <h2 style={{fontSize:'2.5vh'}}>Display Code Explanation</h2>
                        <button
                            className={"box-button mt-[4vh]"}
                            onClick={() => {
                                goToExp()
                            }}
                        >View</button>
                    </div>
                    <div className={"inner-page-box w-[35vw] h-[25vh] mr-[10vw] float-right"} >
                        <h2 style={{fontSize:'2.5vh'}}>Download Output.txt</h2>
                        <button
                            className={"box-button mt-[4vh]"}
                            onClick={() => {
                                const blob = new Blob([code], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = 'Output.txt';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                            }}
                        >
                            <img src={download} alt="Download" style={{justifySelf:"center", width: '25%'}} />
                        </button>

                    </div>
                </div>
                <div className={"inner-page-box w-[80vw] h-[35vh]"}>
                        <div style={{marginTop:"10vh"}}>
                            {file !== null && responseString !== "" ?
                                <Save file={file} responseText={responseString} />
                                :
                                <div>
                                    <h2 style={{fontSize:'2.5vh', marginTop:'4vh'}}>Welcome, {user?.sub?.slice(-8).toUpperCase()}! Click here to view <br/> your saved work</h2>
                                    <button className={'box-button'} onClick={goToHistory}>View History</button>
                                </div>
                            }
                        </div>
                </div>
            <Footer />
        </>
    );
};

export default SessionImgToGem;