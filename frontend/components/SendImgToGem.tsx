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
import download from "../src/assets/download.png";
import StartSessionBtn from "./StartSessionBtn.tsx";

// Message type definition
interface Message {
    type: "user" | "bot" | "system" | "thinking";
    message: string;
}
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_LLM_API_KEY });

interface Props {
    code: string;
    setCode: (code: string) => void;
    explanation: string;
    setExplanation: (exp: string) => void;
    imageUrl: string | null;
    setImageUrl: (url: string) => void;
}

const SendImgToGem: React.FC<Props> = ({ imageUrl, setImageUrl,code, setCode, explanation, setExplanation }) => {
    const [response, setResponse] = useState<Message[]>([]);
    const { isAuthenticated, user, logout, loginWithRedirect} = useAuth0();
    //this can be used later if we add a loading animation for gemini
    //const [isLoading, setIsLoading] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);
    const [responseString, setResponseString] = useState<string>("");
    const navigate = useNavigate();
    const goToHistory = () => {
        navigate('/viewHistory');
    }
    const goToExp = () => {
        console.log(code);
        console.log(explanation);
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

        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
        const localUrl = URL.createObjectURL(file);
        setImageUrl(localUrl);

        let resStr = "";

        //setIsLoading(true);

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
                    const resParts = resStr.split('----------');
                    setCode(resParts[0]);
                    setExplanation(resParts[1]);
                    console.log(code);
                    console.log(explanation);
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
            <div className="inner-page-box" style={{ width: '80vw', height: '35vh' }}>
                <h2 style={{ fontSize: '20px' }}>Your ERD is displayed here</h2>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="ERD Preview"
                        style={{ maxWidth: '100%', maxHeight: '30vh', objectFit: 'contain' }}
                    />
                ) : (
                    <p>No image available.</p>
                )}
            </div>
            <div className={"inner-page-box"} style={{width:"80vw", height:"70vh", overflow:"scroll"}}>
                {response.length === 0 ? (
                    <h1 style={{fontSize:'max(15px, 2.5vh)'}}>Upload your image to see code</h1>
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

            <div style={{height:'25vh', marginBottom:"6vh"}}>
                <div className={"inner-page-box w-[35vw] h-[25vh] mr-[10vw] float-left"}>
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
                        <button className={'box-button mt-[4vh]'} onClick={handleAuthClick}>Login</button>
                    </div>

                }
            </div>

            <Footer/>
        </>
    );
};

export default SendImgToGem;
