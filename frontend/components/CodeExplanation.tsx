import Header from "./Header";
import Footer from "./Footer";
import "./gem.css";
import "../src/App.css"
import { useAuth0 } from "@auth0/auth0-react";
import {ChangeEvent, useState} from "react";
import Save from "./Save.tsx";
import {createPartFromUri, createUserContent, GoogleGenAI} from "@google/genai";
import {PulseLoader} from "react-spinners";
import LineTypeRenderer from "../components/StepByStep.tsx"
import {splitRegExp} from "../src/common/types.ts"

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_LLM_API_KEY });

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
        - In the explanation avoid long lines, create a new line and continue if one line exceeds 60 characters`;

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

        setIsLoading(true);

        const compressImageFile = (file: File): Promise<File> => {
            return new Promise((resolve) => {
                const img = new Image();
                const reader = new FileReader();

                reader.onload = (e) => {
                    if (!e.target?.result) return;
                    img.src = e.target.result as string;
                    const dataURL = img.src as string;
                    localStorage.setItem("imageDataURL", dataURL);
                    console.log("imageDataURL ", localStorage.getItem("imageDataURL"));
                };

                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const maxSize = 1200;
                    const scale = Math.min(maxSize / img.width, maxSize / img.height);

                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;

                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) return;
                            const newFile = new File([blob], file.name, {
                                type: "image/jpeg",
                                lastModified: Date.now(),
                            });
                            resolve(newFile);
                        },
                        "image/jpeg",
                        1
                    );
                };

                reader.readAsDataURL(file);

            });
        };



        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
        // "imageFile": fileBuffer?.toString("base64") || "No image",);
        await compressImageFile(file);
        // console.log("is this even showning up bro", localStorage.getItem("imageDataURL"));

        const localUrl = URL.createObjectURL(file);
        setImageUrl(localUrl);

        console.log("imageurl ", localUrl)
        console.log("local ", localStorage.getItem("localURL"));
        console.log("equivlanet?? ", localUrl === localStorage.getItem("localURL"))

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

                        <header className="text-center text-4xl mt-8 font-bold">Code Generation</header>

                        <div id="input-container" style={{border: "1vh light grey", borderRadius:"2vh", marginTop:"3vh", marginBottom:"3vh"}}>
                            <button className="cursor-pointer clear-btn bg-[#BD0A0A] hover:bg-[#700606] text-white" onClick={() => {
                                const blob = new Blob([code], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = 'Output.txt';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                            }}>
                                Download Output
                            </button>

                            <input
                                type="file"
                                accept=".png,.jpg"
                                onChange={handleFileUpload}
                                className="chat-input"
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
                                    <Save file={localStorage.getItem("imageDataURL")} responseText={localStorage.getItem("response")} />
                                </button>
                            )}
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
                                            <div className={"inner-page-box"} style={{ height: '60vh', width: '100%', overflow: 'scroll' }}>
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
                                                {!code && (isLoading ? (<div><h1 style={{fontSize:'max(15px, 2vh)'}}>Loading SQL, please wait...</h1>
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
                                            <div className="inner-page-box" style={{ flex: 1, overflow: 'scroll' }}>
                                                    {explanation || localStorage.getItem("explanation") ? (
                                                        <h3 style={{ fontSize: '20px', justifySelf: 'left' }}>
                                                        <LineTypeRenderer
                                                            items={explanation ?? localStorage.getItem("explanation")}
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
                                        <div style={{ width: '45vw', display: 'flex', flexDirection: 'column' }}>
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
                                            <div className="inner-page-box" style={{ flex: 1, overflow: 'scroll' }}>
                                                    {explanation || localStorage.getItem("explanation") ? (
                                                        <h3 style={{ fontSize: '20px', justifySelf: 'left' }}>
                                                            <LineTypeRenderer
                                                                items={explanation ?? localStorage.getItem("explanation")}
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
                                    <div style={{width: '45vw', display: 'flex', flexDirection: 'column', gap: '2vh', height: '66vh'}}>
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
                                                {!code && (isLoading ? (<div><h1 style={{fontSize:'max(15px, 2vh)'}}>Loading SQL, please wait...</h1>
                                                        <PulseLoader color={"black"} loading={isLoading} size={10} margin={4} aria-label="Loading Spinner" data-testid="loader"/></div>)
                                                    : (<h1 style={{fontSize:'max(15px, 2vh)'}}>Upload your image to see code</h1>))}
                                            </div>
                                        </div>

                                        <div style={{ height: '33vh', display: 'flex', flexDirection: 'column' }}>
                                            <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('explanation')}>
                                                AI Explanation ▼
                                            </h1>
                                            <div className="inner-page-box" style={{ flex: 1, overflow: 'scroll' }}>
                                                    {explanation || localStorage.getItem("explanation") ? (
                                                        <h3 style={{ fontSize: '20px', justifySelf: 'left' }}>
                                                            <LineTypeRenderer
                                                                items={explanation ?? localStorage.getItem("explanation")}
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