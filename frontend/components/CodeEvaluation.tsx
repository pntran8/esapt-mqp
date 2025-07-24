import { useState, ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
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
import StartSessionBtn from "./StartSessionBtn.tsx";
import download from "@/src/assets/download.png";

// Message type definition
interface Message {
    type: "user" | "bot" | "system" | "thinking";
    message: string;
}
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_LLM_API_KEY });



const CodeEvaluation = () => {
    const [response, setResponse] = useState<Message[]>([]);
    const { isAuthenticated, user, logout, loginWithRedirect} = useAuth0();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);
    const [responseString, setResponseString] = useState<string>("");
    const navigate = useNavigate();
    const goToHistory = () => {
        navigate('/viewHistory');
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

        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
        //const localUrl = URL.createObjectURL(file);

        let resStr = "";

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
                            "I am providing you with a conceptual Entity-Relationship diagram that is in either Chen or Crow's Foot notation. " +
                            "Return that diagram translated into SQL code. " +
                            "Look at the lines between relationships and tables, and build extra tables if those lines have the features of a many-to-many relationship in either notation. " +
                            "Do not make assumptions about relationships or attributes based on names, solely consider the picture. " +
                            "Remember that in Chen notation, a 1 cardinality means one, and a letter cardinality means many, so 1 to M is one-to-many. Relationships are represented as diamonds, connected to the the entities they are relating." +
                            "Also remember that primary keys are signified by underlined text, and partial keys are signified by text underlined with a dashed line. " +
                            "Pay close attention to whether the text is underlined or not because the space between the text and underline may be small. " +
                            "Do not assume anything is a primary or partial key unless it is underlined. " +
                            "Print out the SQL code, then '----------' on a new line, then an explanation for the logic behind the code.",
                        ]),
                    });

                    //const text = response.text ?? "No response received.";
                    //console.log(text);

                    setResponse((prev) => [
                        ...prev,
                        { type: "bot", message: response.text!.split('----------')[0].toString() },
                    ]);

                    resStr = response.text ?? "No bot response available";
                    //const resParts = resStr.split('----------');

                    setResponseString(resStr);
                    //setIsLoading(false);


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

    /*const handleClear = () => {
        setResponse([]);
        setIsLoading(false);
        setFile(null);
        setResponseString("");
    };

    //
    /*<!--     <button onClick={handleClear} className="clear-btn">
                    Clear
                </button>1-->*/
    return (
        <>
            <Header />
            <div id="input-container" style={{border:"1vh light grey", borderRadius:"2vh", marginTop:"3vh"}}>

                {file !== null && responseString !== "" && isAuthenticated && (
                    <button className="cursor-pointer clear-btn">
                        <Save file={file} responseText={responseString} />
                    </button>
                )}
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
            <div style={{height:'75vh'}}>
                <div className={"inner-page-box"} style={{width:"35vw", height:"70vh", overflow:"scroll", float:"left", marginLeft:"20vh"}}>
                    {response.length === 0 ? (
                        <h1 style={{fontSize:'2.5vh'}}>Upload your image to see code</h1>
                    ) : (
                        <div>
                            {response.map((msg, index) => (
                                <div key={index} >
                                    <ReactMarkdown>{msg.message}</ReactMarkdown>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className={"inner-page-box"} style={{width:"35vw", height:"70vh", overflow:"scroll", float:"right", marginRight:"20vh"}}>
                    <h1 style={{fontSize:'2.5vh'}}>Insert code here(this is currently just a h1)</h1>
                </div>
            </div>


            <div className={"inner-page-box"} style={{width:"80vw", height:"30vh"}}>
                <h2 style={{fontSize:'2.5vh'}}>LLM outputs explanation of what it finds here</h2>

            </div>

            <div className={"inner-page-box"} style={{width:'80vw', height:'35vh'}}>
                {isAuthenticated ?
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
                    :
                    <div>
                        <h2 style={{fontSize:'2.5vh', marginTop:'5vh'}}>Log in to save your work</h2>
                        <button className={'box-button'} style={{marginTop:'4vh'}} onClick={handleAuthClick}>Login</button>
                    </div>

                }
            </div>

            <Footer/>
        </>
    );
};

export default CodeEvaluation;