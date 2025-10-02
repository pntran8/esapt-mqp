import Header from "./Header";
import Footer from "./Footer";
import "./gem.css";
import "../src/App.css"
import { useAuth0 } from "@auth0/auth0-react";
import {ChangeEvent, useEffect, useState} from "react";
import Save from "./Save.tsx";
import {createPartFromUri, createUserContent, GoogleGenAI} from "@google/genai";
import {PulseLoader} from "react-spinners";
import LineTypeRenderer from "../components/StepByStep.tsx"
import {splitRegExp} from "../src/common/types.ts"
import {compressImageFile} from "../src/common/compress.ts";
import {instruction} from "../src/common/instruction.ts";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_LLM_API_KEY });


const CodeExplanation = () => {
    const { isAuthenticated } = useAuth0();
    const [file, setFile] = useState<File | null>(null);
    const [responseString, setResponseString] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
    const [code, setCode] = useState<string>("");
    const [explanation, setExplanation] = useState<string>("");
    const [popup, setPopup] = useState<boolean>(false);
    const [zoomIn, setZoomIn] = useState<boolean>(false);


    /*
    uncomment if you local storage on page opening
    useEffect(() => {
        localStorage.clear();
    }, []);*/
    const [expandedSections, setExpandedSections] = useState({
        erd: true,
        code: true,
        explanation: true,
    });

    const toggleSection = (section: 'erd' | 'code' | 'explanation') => {
        setExpandedSections(prev => {
            const currentlyExpanded = Object.values(prev).filter(Boolean).length;

            if (currentlyExpanded === 1 && prev[section]) {
                return prev; // Return unchanged state
            }

            return {
                ...prev,
                [section]: !prev[section]
            };
        });
    };

    // how many sections are expanded
    const expandedCount = Object.values(expandedSections).filter(Boolean).length;

    // layout style based on what's expanded
    const getLayoutStyles = () => {
        if (expandedCount === 0) {
            return { display: 'none' };
        } else if (expandedCount === 1) {
            return {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start'
            };
        } else {
            return {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: '2vh'
            };
        }
    };

    const renderCollapsedHeaders = () => {
        const collapsedSections = [];
        if (!expandedSections.erd) collapsedSections.push({ key: 'erd', title: 'Your ERD' });
        if (!expandedSections.code) collapsedSections.push({ key: 'code', title: 'Code Output' });
        if (!expandedSections.explanation) collapsedSections.push({ key: 'explanation', title: 'AI Explanation' });

        if (collapsedSections.length === 0) return null;

        return (
            <div style={{
                display: 'flex',
                gap: '2vh',
                marginBottom: '2vh',
                paddingLeft: '5vw',
                paddingRight: '5vw'
            }}>
                {collapsedSections.map(section => (
                    <h1
                        key={section.key}
                        onClick={() => toggleSection(section.key as 'erd' | 'code' | 'explanation')}
                        style={{
                            cursor: 'pointer',
                            padding: '10px 20px',
                            border: '2px solid #BD0A0A',
                            borderRadius: '5px',
                            margin: 0
                        }}
                    >
                        {section.title}
                    </h1>
                ))}
            </div>
        );
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {

        localStorage.clear();
        setCode("");
        setExplanation("");
        setResponseString("");

        setIsLoading(true);


        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
        // "imageFile": fileBuffer?.toString("base64") || "No image",);
        await compressImageFile(file);
        // console.log("is this even showning up bro", localStorage.getItem("imageDataURL"));

        const localUrl = URL.createObjectURL(file);
        setImageUrl(localUrl);

        // console.log("imageurl ", localUrl)
        // console.log("local ", localStorage.getItem("localURL"));
        // console.log("equivlanet?? ", localUrl === localStorage.getItem("localURL"))

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

                    resStr = response.text ?? "No bot response available";
                    setResponseString(resStr);
                    const allParsedLines = splitRegExp(resStr);
                    console.log(allParsedLines);
                    setExplanation(resStr);
                    localStorage.setItem("explanation", resStr);
                    localStorage.setItem("response", resStr);
                    localStorage.setItem("allLines", JSON.stringify(allParsedLines));
                    let finalCode = "";
                    for (const lineLog of allParsedLines) {
                        const line = lineLog.line
                        const title = lineLog.title
                        if (title == "STEP"){
                            finalCode = line;
                        }
                    }
                    console.log("Code:",finalCode);
                    setCode(finalCode);
                    localStorage.setItem("aiCode", finalCode);
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

    function dataURLtoFile(dataUrl: string, filename: string): File {
        const arr = dataUrl.split(",");
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }

    return (
        <>
            {popup ?
                (<div>
                    <div className="relative m-12 bg-grey" style={{height: '90vh'}}>
                        { zoomIn ?
                            (
                                <img
                                    src={imageUrl ? imageUrl : localStorage.getItem("imageDataURL")}
                                    alt="ERD Preview"
                                    className={"cursor-zoom-out"}
                                    onClick={() => setZoomIn(false)}
                                    style={{ width: '200%', height: '200%', objectFit: 'contain' }}
                                />
                            )
                            : (
                                <img
                                    src={imageUrl ? imageUrl : localStorage.getItem("imageDataURL")}
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
                </div>)
                :
                (
                    <div>
                        <Header />

                        <header className="text-center text-4xl mt-8 font-bold">SQL Generation</header>

                        <div id="input-container" className={"bg-[#e7e7e7] p-4 mx-27 rounded-md border-[2px] border-[#BD0A0A] mt-10 flex items-center"} >

                            <input
                                type="file"
                                accept=".png,.jpg"
                                onChange={handleFileUpload}
                                className="chat-input bg-gray-100 flex-grow mr-4"
                                style={{fontSize:'2vh'}}
                            />

                            <button className="cursor-pointer clear-btn bg-[#BD0A0A] hover:bg-[#700606] text-white m-2" onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}>
                                Clear
                            </button>


                            {(file !== null || localStorage.getItem("imageDataURL")) && (responseString !== "" || localStorage.getItem("response") )&& isAuthenticated && (
                                <button className="cursor-pointer clear-btn bg-[#BD0A0A] hover:bg-[#700606]">
                                    {/*HERE IS THE PROBLEM*/}
                                    <Save
                                        file={localStorage.getItem("imageDataURL") ? dataURLtoFile(localStorage.getItem("imageDataURL")!, "image.png") : null}
                                        responseText={localStorage.getItem("response")}
                                    />
                                </button>
                            )}

                            <button className="cursor-pointer clear-btn bg-[#BD0A0A] hover:bg-[#700606] text-white" onClick={() => {
                                let blob;
                                if (localStorage.getItem("aiCode")) {
                                    blob = new Blob([localStorage.getItem("aiCode")], { type: 'text/plain' });
                                }
                                else {
                                    blob = new Blob([code], { type: 'text/plain' });
                                }
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = 'image_to_sql_output.sql';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                            }}>
                                Download SQL
                            </button>
                        </div>

                        {/* collapsed headers */}
                        {renderCollapsedHeaders()}

                        <div style={{
                            height: '75vh',
                            marginTop: '3vh',
                            marginBottom: '1vh',
                            paddingLeft: '5vw',
                            paddingRight: '5vw',
                            ...getLayoutStyles()
                        }}>

                            {/* only one section (centered) */}
                            {expandedCount === 1 && (
                                <>
                                    {expandedSections.erd && (
                                        <div style={{ width: '80vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <h1 style={{marginBottom:'2vh', cursor: 'not-allowed'}} onClick={() => toggleSection('erd')}>
                                                Your ERD ▼
                                            </h1>
                                            <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }} className="border-2 bg-[#E7E7E7] border-[#BD0A0A] cursor-pointer">
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt="ERD Preview"
                                                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                                        onClick={() => setPopup(true)}
                                                    />
                                                ) : localStorage.getItem("imageDataURL") ? (
                                                    <img
                                                        src={localStorage.getItem("imageDataURL")}
                                                        alt="ERD Preview"
                                                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                                        onClick={() => setPopup(true)}
                                                    />
                                                ) : (
                                                    <p>No image available.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {expandedSections.code && (
                                        <div style={{ width: '80vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <h1 style={{cursor: 'not-allowed'}} onClick={() => toggleSection('code')}>
                                                Code Output ▼
                                            </h1>
                                            <div className={"inner-page-box"} style={{ height: '60vh', width: '100%', overflow: 'scroll', textAlign: 'left' }}>
                                                    <pre
                                                        style={{
                                                            margin: 0,
                                                            fontSize: '20px',
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word',
                                                            overflowWrap: 'anywhere',
                                                        }}
                                                    >
                                                    {code ?
                                                        (code
                                                        ) : (
                                                            localStorage.getItem("aiCode")
                                                        )
                                                    }
                                                    </pre>
                                                {!(code || localStorage.getItem("aiCode")) && (isLoading ? (<div><h1 style={{fontSize:'max(15px, 2vh)'}}>Loading SQL, please wait...</h1>
                                                        <PulseLoader color={"black"} loading={isLoading} size={10} margin={4} aria-label="Loading Spinner" data-testid="loader"/></div>)
                                                    : (<h1 style={{fontSize:'max(15px, 2vh)'}}>Upload your image to see code</h1>))}
                                            </div>
                                        </div>
                                    )}
                                    {expandedSections.explanation && (
                                        <div style={{ width: '80vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <h1 style={{cursor: 'not-allowed'}} onClick={() => toggleSection('explanation')}>
                                                AI Explanation ▼
                                            </h1>
                                            <div className="inner-page-box" style={{ height:'60vh', overflow: 'auto'}}>
                                                    {(localStorage.getItem("explanation") || explanation) ? (
                                                        <h3 style={{ fontSize: '20px', justifySelf: 'left' }}>
                                                        <LineTypeRenderer
                                                            items={(localStorage.getItem("explanation") || explanation)}
                                                        />
                                                        </h3>
                                                    ) : isLoading ? (
                                                        <>
                                                            <h1 style={{ fontSize: 'max(15px, 2vh)' }}>
                                                                Generating explanation, please wait...
                                                            </h1>
                                                            <PulseLoader
                                                                color="black"
                                                                loading={isLoading}
                                                                size={10}
                                                                margin={4}
                                                                aria-label="Loading Spinner"
                                                                data-testid="loader"
                                                            />
                                                        </>
                                                    ) : (
                                                        <h1 style={{ fontSize: 'max(15px, 2vh)' }}>
                                                            Upload your ERD to see an explanation
                                                        </h1>
                                                    )}

                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* two sections side by side */}
                            {expandedCount === 2 && (
                                <>
                                    {expandedSections.erd && (
                                        <div style={{ width: '45vw', display: 'flex', flexDirection: 'column' }}>
                                            <h1 style={{marginBottom:'2vh', cursor: 'pointer'}} onClick={() => toggleSection('erd')}>
                                                Your ERD ▼
                                            </h1>
                                            <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}} className="border-2 bg-[#E7E7E7] border-[#BD0A0A] cursor-pointer">
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt="ERD Preview"
                                                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                                        onClick={() => setPopup(true)}
                                                    />
                                                ) : localStorage.getItem("imageDataURL") ? (
                                                    <img
                                                        src={localStorage.getItem("imageDataURL")}
                                                        alt="ERD Preview"
                                                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                                        onClick={() => setPopup(true)}
                                                    />
                                                ) : (
                                                    <p>No image available.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {expandedSections.code && (
                                        <div style={{ width: '45vw', display: 'flex', flexDirection: 'column', textAlign: 'left'  }}>
                                            <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('code')}>
                                                Code Output ▼
                                            </h1>
                                            <div className={"inner-page-box"} style={{ height: '60vh', overflow: 'scroll' }}>
                                                <pre
                                                    style={{
                                                        margin: 0,
                                                        fontSize: '20px',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                {code ?
                                                    (code
                                                    ) : (
                                                        localStorage.getItem("aiCode")
                                                    )
                                                }
                                                </pre>
                                                {!(code || localStorage.getItem("aiCode")) && (isLoading ? (<div><h1 style={{fontSize:'max(15px, 2vh)'}}>Loading SQL, please wait...</h1>
                                                        <PulseLoader color={"black"} loading={isLoading} size={10} margin={4} aria-label="Loading Spinner" data-testid="loader"/></div>)
                                                    : (<h1 style={{fontSize:'max(15px, 2vh)'}}>Upload your image to see code</h1>))}
                                            </div>
                                        </div>
                                    )}
                                    {expandedSections.explanation && (
                                        <div style={{ width: '45vw', display: 'flex', flexDirection: 'column' }}>
                                            <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('explanation')}>
                                                AI Explanation ▼
                                            </h1>
                                            <div className="inner-page-box" style={{ height:'60vh', overflow: 'auto'}}>
                                                    {(localStorage.getItem("explanation") || explanation) ? (
                                                        <h3 style={{ fontSize: '20px', justifySelf: 'left' }}>
                                                            <LineTypeRenderer
                                                                items={(localStorage.getItem("explanation") || explanation)}
                                                            />
                                                        </h3>
                                                    ) : isLoading ? (
                                                        <>
                                                            <h1 style={{ fontSize: 'max(15px, 2vh)' }}>
                                                                Generating explanation, please wait...
                                                            </h1>
                                                            <PulseLoader
                                                                color="black"
                                                                loading={isLoading}
                                                                size={10}
                                                                margin={4}
                                                                aria-label="Loading Spinner"
                                                                data-testid="loader"
                                                            />
                                                        </>
                                                    ) : (
                                                        <h1 style={{ fontSize: 'max(15px, 2vh)' }}>
                                                            Upload your ERD to see an explanation
                                                        </h1>
                                                    )}
                                            </div>

                                        </div>
                                    )}
                                </>
                            )}

                            {/* all three sections (og layout) */}
                            {expandedCount === 3 && (
                                <>
                                    {/* erd */}
                                    <div style={{ width: '45vw', display: 'flex', flexDirection: 'column' }}>
                                        <h1 style={{marginBottom:'2vh', cursor: 'pointer'}} onClick={() => toggleSection('erd')}>
                                            Your ERD ▼
                                        </h1>
                                        <div style={{ height: '66vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="border-2 bg-[#E7E7E7] border-[#BD0A0A]">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt="ERD Preview"
                                                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                                    onClick={() => setPopup(true)}
                                                />
                                            ) : localStorage.getItem("imageDataURL") ? (
                                                <img
                                                    src={localStorage.getItem("imageDataURL")}
                                                    alt="ERD Preview"
                                                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                                    onClick={() => setPopup(true)}
                                                />
                                            ) : (
                                                <p>No image available.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* code and explanation stacked */}
                                    <div style={{width: '45vw', display: 'flex', flexDirection: 'column', gap: '2vh', height: '66vh', textAlign: 'left' }}>
                                        <div style={{ height: '33vh', display: 'flex', flexDirection: 'column', marginBottom: '3vh'}}>
                                            <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('code')}>
                                                Code Output ▼
                                            </h1>
                                            <div className={"inner-page-box"} style={{ flex: 1, overflow: 'scroll' }}>
                                                <pre
                                                    style={{
                                                        margin: 0,
                                                        fontSize: '20px',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                {code ?
                                                    (code
                                                    ) : (
                                                        localStorage.getItem("aiCode")
                                                    )
                                                }
                                                </pre>
                                                {!(code || localStorage.getItem("aiCode")) && (isLoading ? (<div><h1 style={{fontSize:'max(15px, 2vh)'}}>Loading SQL, please wait...</h1>
                                                        <PulseLoader color={"black"} loading={isLoading} size={10} margin={4} aria-label="Loading Spinner" data-testid="loader"/></div>)
                                                    : (<h1 style={{fontSize:'max(15px, 2vh)'}}>Upload your image to see code</h1>))}
                                            </div>
                                        </div>

                                        <div style={{ height: '33vh', display: 'flex', flexDirection: 'column' }}>
                                            <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('explanation')}>
                                                AI Explanation ▼
                                            </h1>
                                            <div className="inner-page-box" style={{ flex: 1, overflow: 'scroll' }}>
                                                    {(localStorage.getItem("explanation") || explanation) ? (
                                                        <h3 style={{ fontSize: '20px', justifySelf: 'left' }}>
                                                            <LineTypeRenderer
                                                                items={(localStorage.getItem("explanation") || explanation)}
                                                            />
                                                        </h3>
                                                    ) : isLoading ? (
                                                        <>
                                                            <h1 style={{ fontSize: 'max(15px, 2vh)' }}>
                                                                Generating explanation, please wait...
                                                            </h1>
                                                            <PulseLoader
                                                                color="black"
                                                                loading={isLoading}
                                                                size={10}
                                                                margin={4}
                                                                aria-label="Loading Spinner"
                                                                data-testid="loader"
                                                            />
                                                        </>
                                                    ) : (
                                                        <h1 style={{ fontSize: 'max(15px, 2vh)' }}>
                                                            Upload your ERD to see an explanation
                                                        </h1>
                                                    )}
                                            </div>

                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <Footer/>
                    </div>
                )
            }

        </>
    );
};

export default CodeExplanation;