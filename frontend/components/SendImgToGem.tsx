import { useState, ChangeEvent } from "react";
//import ReactMarkdown from "react-markdown";
import Header from "./Header";
import Footer from "./Footer";
import "./gem.css";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import Save from "./Save.tsx";
import "../src/App.css"
import {useNavigate} from "react-router-dom";
import * as React from "react";
import {useAuth0} from "@auth0/auth0-react";
import download from "../src/assets/download.png";
import StartSessionBtn from "./StartSessionBtn.tsx";
import { PulseLoader } from "react-spinners";

// Message type definition
interface Message {
    type: "user" | "bot" | "system" | "thinking";
    message: string;
}
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_LLM_API_KEY });

interface Props {
    code: string;
    setCode: (code: string) => void;
    explanation: lineType[];
    setExplanation: (exp: lineType[]) => void;
    imageUrl: string | null;
    setImageUrl: (url: string | null) => void;
}


interface lineType {
    line: string;
    title: string;
}

const instruction = `
        You are given an image of a conceptual ER diagram that could either be (Chen or Crow's Foot).
        Your job is to (1) extract the ER model strictly from visual cues, and (2) produce cumulative SQL code step-by-step.
        
        Definitions
        
        Chen Notation
        - Entities are rectangles.
        - Relationships are diamonds, connected to the entities they relate.
        - Cardinality: 1 means one; M means many; 1 to M means one-to-many.
        - Keys: Primary keys are underlined text. Partial keys are underlined with a dashed line.
        - Pay close attention to whether the text is underlined; spacing between the text and the underline can be small.
        
        Crow’s Foot Notation
        - Entities are rectangles.
        - Relationships are lines with symbols at the ends: crow’s foot (<) = many; single line (|) = one.
        - One-to-many is represented by a single line on one end and a crow’s foot on the other.
        
        General Rules
        - Many-to-many relationships require creating a separate table to represent the association.
        - Do not assume attributes or keys based on names alone—only use explicit diagram features.
        - Only create foreign keys when there is a direct relationship between entities.
        
        SQL CONVENTIONS
        - Dialect: PostgreSQL 15+
        - Constraints: use inline constraints.
        - Use NOT NULL when total participation requires it.
        - For weak entities: composite PK includes owner PK + weak key; add FK to owner with ON DELETE CASCADE.
        - For 1:1 relationships: place the FK on the total-participation side and add UNIQUE to enforce 1:1.
        
        STEP-BY-STEP MAPPING
        Step 1 — Strong Entities
        - Create one table per strong entity with all simple attributes.
        - Use underlined attributes as the primary key. Do not invent surrogate keys unless the diagram lacks a key.
        
        Step 2 — Weak Entities
        - Create one table per weak entity with its simple attributes.
        - Add FK to the owner; composite PK = owner PK + partial/own key (if present). Use ON DELETE CASCADE on that FK.
        
        Step 3 — Binary 1:1 Relationships
        - Include the PK of one entity as an FK in the other, choosing the side with total participation if shown.
        - Add relationship attributes into that same table.
        - Enforce 1:1 with UNIQUE on the FK and NOT NULL if participation is total.
        
        Step 4 — Binary 1:N Relationships
        - Put the 1-side PK as an FK in the N-side table.
        - Include any relationship attributes in the N-side table.
        - Use NOT NULL if the N-side participation is total.
        
        Step 5 — Binary M:N Relationships
        - Create a new join table.
        - Primary key = combination of the participating entities’ PKs (and include relationship attributes).
        
        OUTPUT FORMAT
        Print sections in the order below, each bounded by single-line markers:
        
        === RECOGNIZED FROM IMAGE ===
        (Plain text list of entities, attributes, keys (underline/dashed), relationships, and cardinalities derived from the image only.)
        
        === STEP 1 — STRONG ENTITIES (SQL) ===
        -- SQL for Step 1 only
        === EXPLANATION / ASSUMPTIONS / ANOMALIES FOR STEP 1===
        - Assumptions & Ambiguities: bullet list
        - Explanation
            
        === STEP 2 — WEAK ENTITIES (SQL) ===
        -- SQL After Applying Step 2
        
        === EXPLANATION / ASSUMPTIONS / ANOMALIES FOR STEP 2===
        - Assumptions & Ambiguities: bullet list
        - Explanation
        
        === STEP 3 — BINARY 1:1 (SQL) ===
        -- SQL After Applying Step 3
      
        === EXPLANATION / ASSUMPTIONS / ANOMALIES FOR STEP 3===
        - Assumptions & Ambiguities: bullet list
        - Explanation
        
        === STEP 4 — BINARY 1:N (SQL) ===
        -- SQL After Applying Step 4
        
        === EXPLANATION / ASSUMPTIONS / ANOMALIES FOR STEP 4===
        - Assumptions & Ambiguities: bullet list
        - Explanation
        
        === STEP 5 — BINARY M:N (SQL) ===
        -- SQL After Applying Step 5
        
        === EXPLANATION / ASSUMPTIONS / ANOMALIES FOR STEP 5===
        - Assumptions & Ambiguities: bullet list
        - Explanation
        
        STRICT RULES
        - Use the exact section headers above (including capitalization and punctuation).
        - Include ALL sections even if some are empty; 
        - Do not output anything outside these sections.
        - For SQL print the cumulative output from each step
        `.trim();

const SendImgToGem: React.FC<Props> = ({ imageUrl, setImageUrl,code, setCode, explanation, setExplanation }) => {
    const [response, setResponse] = useState<Message[]>([]);
    const { isAuthenticated, user, logout, loginWithRedirect} = useAuth0();
    //this can be used later if we add a loading animation for gemini
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);
    const [responseString, setResponseString] = useState<string>("");
    const navigate = useNavigate();
    const [popup, setPopup] = useState<boolean>(false);
    const [zoomIn, setZoomIn] = useState<boolean>(false);
    const goToHistory = () => {
        navigate('/viewHistory');
    }

    const splitRegExp =  (explanation: string): lineType[] => {
        const lines = explanation.split(/\r?\n/);
        const allLines: lineType[] = []

        let currentTitle = "";
        let currentSection: string[] = [];

        const flush = () => {
            const text = currentSection.join("\n").trim();
            if (text) allLines.push({line: text, title: currentTitle});
            currentSection = []
        }
        for (const raw of lines) {
            if (raw.startsWith("===")) {
                // new header: first flush previous section
                flush();
                if (raw.startsWith("=== RECOGNIZED")) {
                    currentTitle = "RECOGNIZED";
                } else if (raw.startsWith("=== EXPLANATION")) {
                    currentTitle = "EXPLANATION";
                } else if (raw.startsWith("=== STEP")) {
                    currentTitle = "STEP";
                } else {
                    currentTitle = "UNKNOWN TITLE"
                }
                continue;
            }
            currentSection.push(raw)
        }
        flush();
        return allLines;
    }

    const goToExp = () => {
        //console.log(code);
        //console.log(explanation);
        navigate("/explanation");
    }
    const handleAuthClick = async () => {
        if (isAuthenticated) {
            await logout({
                logoutParams: { returnTo: window.location.origin }
            });
            navigate('/imggem');
        } else {
            await loginWithRedirect();
            console.log("sendtogem login button icon authenticated");
            navigate('/imggem');
        }
    };
    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {

        setIsLoading(true);

        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
        const localUrl = URL.createObjectURL(file);
        setImageUrl(localUrl);

        let resStr = "";


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
                            instruction,
                        ]),
                    });

                    //const text = response.text ?? "No response received.";
                    //console.log(text);

                    setResponse((prev) => [
                        ...prev,
                { type: "bot", message: response.text!.toString() },
                    ]);

                    resStr = response.text ?? "No bot response available";
                    console.log(resStr);
                    const newExp = splitRegExp(resStr);
                    setExplanation(newExp);
                    let finalCode = "";
                    for (const lineLog of newExp) {
                        const line = lineLog.line
                        const title = lineLog.title
                        if (title == "STEP"){
                            finalCode = line;
                        }
                    }
                    setCode(finalCode);
                    console.log(code);
                    console.log(explanation);
                    setResponseString(resStr);
                    setIsLoading(false);


                } catch (err) {
                    console.error("Gemini error:", err);
                    /*setResponse((prev) => [
                        ...prev,
                        {type: "system", message: "Failed to read or process the file."}
                    ]);*/
                }
            }
        }
    }

    return (
        <>
            <div>
                {popup ? (
                        <div className="">
                            <div className="relative m-12" style={{height: '90vh'}}>
                                { zoomIn ?
                                    (
                                    <img
                                        src={imageUrl}
                                        alt="ERD Preview"
                                        className={"cursor-zoom-out"}
                                        onClick={() => setZoomIn(false)}
                                        style={{ width: '200%', height: '200%', objectFit: 'contain' }}
                                    />
                                    )
                                : (
                                    <img
                                        src={imageUrl}
                                        alt="ERD Preview"
                                        className={"cursor-zoom-in"}
                                        onClick={() => setZoomIn(true)}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                    )}

                                <button
                                    type="button"
                                    onClick={() => setPopup(false)}
                                    className="absolute top-2 right-2 focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-red-600 dark:hover:bg-red-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                    ) :
                    (
                        <div>
                            <Header/>
                            <h1>Generate SQL from ERD</h1>
                            <div id="input-container"
                                 style={{border: "1vh light grey", borderRadius:"2vh", marginTop:"3vh"}}>
                                <button className="cursor-pointer clear-btn">
                                    <StartSessionBtn/>
                                </button>
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
                                    {!imageUrl && (
                                        <h2 style={{ fontSize: '2.5vh', margin: '0 0 1vh 0' }}>Your ERD is displayed here</h2>
                                    )}
                                    <div style={{height: '100%', width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="border-2 border-[#BD0A0A]">
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                onClick={() => setPopup(true)}
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
                                        isLoading ? (<div><h1 style={{fontSize:'max(15px, 2.5vh)'}}>Loading SQL, please wait...</h1>
                                                <PulseLoader color={"black"} loading={isLoading} size={15} margin={4} aria-label="Loading Spinner" data-testid="loader"/></div>)
                                            : (<h1 style={{fontSize:'max(15px, 2.5vh)'}}>Upload your image to see code</h1>)
                                    ) : (
                                        <div>
                                            <code style={{ fontSize: '20px', whiteSpace: 'pre-wrap' }}>
                                                {code}
                                            </code>
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
                            <div className={"inner-page-box w-[50vw] h-[30vh]"}>
                                {isAuthenticated ?
                                    <div style={{marginTop:"5vh"}}>
                                        {file !== null && responseString !== "" ?
                                            <Save file={file} responseText={responseString} />
                                            :
                                            <div>
                                                <h2 style={{fontSize:'2.5vh', marginTop:'4vh'}}>Welcome, {user?.sub?.slice(-8).toUpperCase()}! Click here to view <br/> your saved work</h2>
                                                <button className={'box-button'} onClick={goToHistory}>View History</button>
                                            </div>
                                        }
                                    </div>
                                    :
                                    <div>
                                        <h2 style={{fontSize:'2.5vh', marginTop:'5vh'}}>Log in to save your work</h2>
                                        <button className={'box-button mt-[4vh]'} onClick={handleAuthClick}>Login</button>
                                    </div>

                                }
                            </div>

                            <Footer/>
                        </div>
                    )}
            </div>

        </>
    );
};

export default SendImgToGem;
