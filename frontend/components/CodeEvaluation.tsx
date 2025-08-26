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
import {useAuth0} from "@auth0/auth0-react";
import { PulseLoader } from "react-spinners";

// Message type definition
interface Message {
    type: "user" | "bot" | "system" | "thinking";
    message: string;
}
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_LLM_API_KEY });



const CodeEvaluation = () => {
    const [response, setResponse] = useState<Message[]>([]);
    const { isAuthenticated} = useAuth0();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [userSchema, setUserSchema] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [responseString, setResponseString] = useState<string>("");

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


    const handleUserSchema = (e) => {
        setUserSchema(e.target.value);
    }

    const [diffResult, setDiffResult] = useState<any[]>([]);
    const [formattedResult, setFormattedResult] = useState<any[]>([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const formatForeignKeys = (fkArray: string[][]) => {
        return fkArray.map(pair => pair.join(",")).join(" |");
    };



    function getTableNameDiffs(data, formattedBlocks: any[], startingNum: number) {
        const splitting = data.diff[0].split("(this=");
        console.log("splitting", splitting);
        const rawLine = data.diff[0];
        const match = rawLine.match(/Identifier\(this=([A-Za-z0-9_]+)/);
        const cleanedLine = match ? `Tables only in schema 1: ${match[1]}` : rawLine;
        formattedBlocks.push(cleanedLine + "\n");
        if (data.diff[1].includes("only")) {
            startingNum += 1;
            const rawLine2 = data.diff[1];
            console.log(data.diff[1]);
            const match2 = rawLine2.match(/Identifier\(this=([A-Za-z0-9_]+)/);
            const cleanedLine2 = match2 ? `Tables only in schema 2: ${match2[1]}` : rawLine2;
            formattedBlocks.push(cleanedLine2);
        }
        return startingNum;
    }

    function getAttributeDiffs(bullets: any[], i: number) {
        const rawArr = bullets[i].replace("Attribute differences: ", "").trim();

        const inner = rawArr.slice(1, -1);

        const parts = inner.split(/",\s*"/).map(str => str.replace(/^"|"$/g, "")); // remove outer quotes

        for (let k = 0; k < parts.length; k++) {
            parts[k] = parts[k]
                .replace(/only in\s+\d:\s*/i, "")
                .replace(/[\{\}']/g, "")
                .trim();
        }

        bullets[i] = "Attribute differences: | Schema 1: " + (parts[0] || "None") + " | Schema 2: " + (parts[1] || "None");
    }

    function getForeignKeyDiffs(bullets: any[], i: number | number) {
        const rawArr = bullets[i].split(":");
        const strSchema1Raw = rawArr[2].replace(/\s*\n\s*schema2/, "");
        const cleaned = strSchema1Raw.trim().replace(/'/g, '"');
        const cleaned2 = rawArr[3].trim().replace(/'/g, '"');

        const arr = JSON.parse(cleaned2);
        const arr2 = JSON.parse(cleaned);

        for (let i = 0; i < arr.length; i++) {
            arr[i][0] = " Ref. Table: " + arr[i][0];
            arr[i][1] = " Ref. Column: " + arr[i][1];
        }

        for (let i = 0; i < arr2.length; i++) {
            arr2[i][0] = " Ref. Table: " + arr2[i][0];
            arr2[i][1] = " Ref. Column: " + arr2[i][1];
        }

        console.log("arr", arr)
        console.log("arr2", arr2)

        bullets[i] = "Foreign Key differences: | Schema 1: | " + (arr.length > 0 ? formatForeignKeys(arr) : "None") + "| Schema 2: | " + (arr2.length > 0 ? formatForeignKeys(arr2) : "None");

        console.log("bullets", bullets[i]);
    }

    const handleCompare = async () => {
        setLoading(true);
        setError(null);
        setDiffResult(null);

        let schema1 = "";
        if (localStorage.getItem("aiCode") !== null && response.length < 1) {
            console.log("1")
            schema1 = localStorage.getItem("aiCode") as string;
        }
        else if (response.length > 0){
            console.log("2")
            schema1 = response[0].message
            localStorage.setItem("aiCode", response[0].message);
        }
        else{
            console.log("3")
            schema1 = ""
        }

        schema1.replace("sql", "")
        schema1.replace("`", "")

        console.log("AI SCHEMA", schema1);
        console.log("USER", userSchema);
        const cleanedSchema = schema1
            .replace(/^```sql\s*/, '')
            .replace("```", '')
            .trim();

        console.log(cleanedSchema)
        try {
            const res = await fetch("/api/compare", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    schema1: cleanedSchema,
                    schema2: userSchema
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Compare failed");
            }

            const data = await res.json();
            setDiffResult(data.diff);

            const formattedBlocks = [];
            const tableNameDiffs = [];


            if(data.diff){
                let startingNum = 0;
                if (!data.diff[0].includes("Comparing")){
                    startingNum += 1;
                    startingNum = getTableNameDiffs(data, tableNameDiffs, startingNum);
                }
                for (; startingNum < data.diff.length; startingNum += 4) {
                    if (data.diff[startingNum].includes("Comparing")) {
                        const header = data.diff[startingNum];
                        let bullets = [data.diff[startingNum + 1], data.diff[startingNum + 2], data.diff[startingNum + 3]];

                        for (let i = 0; i < 3; i++) {
                            if (!bullets[i].includes("same")) {
                                if (i === 0) {
                                    getAttributeDiffs(bullets, i);
                                }

                                if (i === 2) {
                                    getForeignKeyDiffs(bullets, i);
                                }
                            }
                            else if (bullets[i].includes("same") && i == 0) {
                                bullets[i] = "Attributes are equivalent";
                            } else if (bullets[i].includes("same") && i == 1) {
                                bullets[i] = "Primary keys are equivalent";
                            } else if (bullets[i].includes("same") && i == 2) {
                                bullets[i] = "Foreign keys are equivalent";
                            }

                        }

                        if (bullets.every(b => b.includes("equivalent"))) {
                            bullets = ["Both Tables Are Equivalent"];
                        }


                        formattedBlocks.push(
                            <div key={startingNum}>
                                {tableNameDiffs.length > 0 && tableNameDiffs.map((diff, index) => (
                                    <h1 key={index} className="font-bold">{diff}</h1>
                                ))}

                                <h1 className="font-bold">{header}</h1>
                                <ul>
                                    {bullets.map((b, j) => {
                                        console.log("BBBBB", b)
                                        if (b.includes("mismatch:")) {
                                            const [before, afterRaw] = b.split("mismatch:");

                                            if (afterRaw.includes("Column(") || afterRaw.includes("Identifier(")) {
                                                const regex = /this=Identifier\(this=([A-Za-z0-9_]+),/g;
                                                let match;
                                                const columnNames = [];

                                                while ((match = regex.exec(afterRaw)) !== null) {
                                                    columnNames.push(match[1]);
                                                }

                                                const schema2Match = afterRaw.match(/schema2:\s*(\[[^\]]*\])/);
                                                const schema2 = schema2Match ? schema2Match[1] : "[]";

                                                return (
                                                    <li key={j} className={"bg-red-400 font-bold"}>
                                                        {before}mismatch:<br />
                                                        Schema1: [{columnNames.join(", ")}]<br />
                                                        Schema2: {schema2}
                                                    </li>
                                                );
                                            } else {
                                                const after = afterRaw.replace(/\s*schema2:/, ", Schema2:").replace(/[\[\]']/g, "").replace(/\s*schema1:/, "Schema1:");
                                                return (
                                                    <li key={j} className={"bg-red-400 font-bold"}>
                                                        {before}mismatch:<br />
                                                        {after}
                                                    </li>
                                                );
                                            }
                                        }
                                        else if (b.includes("differences:")) {
                                            const test = b.split("|");
                                            console.log("here we are ", test);
                                            return (
                                                <ul className={"bg-red-400 font-bold"}>
                                                    {test.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            );
                                        }
                                        else {
                                            return <li key={j}>{b}</li>;
                                        }
                                    })}
                                </ul>
                                <br />
                            </div>
                        );
                    }
                }
            }

            setFormattedResult(formattedBlocks);

            console.log("typeof", typeof data.diff);
            console.log("here", data.diff);
            console.log("why it not formatting doe", formattedBlocks);
            console.log("there", diffResult);
        } catch (e) {
            console.log("here???")
            setError(e.message);
            setFormattedResult(e.message);
        } finally {
            setLoading(false);
        }

    };


    return (
        <>
            <Header />

            <header className="text-center text-4xl mt-8 font-bold">Code Comparison</header>

            <div id="input-container" style={{border: "1vh light grey", borderRadius:"2vh", marginTop:"3vh"}}>

                {file !== null && responseString !== "" && isAuthenticated && (
                    <button className="cursor-pointer clear-btn">
                        <Save file={file} responseText={responseString} />
                    </button>
                )}

                <button
                    className={"cursor-pointer clear-btn"}
                    style={{
                        backgroundColor: "#BD0A0A",
                        color: "white",

                    }}
                    onClick={handleCompare}
                    disabled={loading}
                >
                    {loading ? "Comparing..." : "Compare"}
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
            </div>

            <div className={"flex"} style={{marginTop:"2vh"}}>
                <h1 className={"w-2/5 font-bold"}>LLM Code</h1>
                <h1 className={"w-1/5 font-bold"}>Your Code</h1>
                <h1 className={"w-2/5 font-bold"}>Comparison</h1>
            </div>

            <div style={{ height: '75vh', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', marginTop:"-2vh"}}>
                <div className="inner-page-box" style={{ width: '28vw', height: '70vh', overflow: 'scroll', marginRight:"-16vh" }}>
                    {localStorage.getItem("aiCode") !== null && response.length === 0 ? (
                        <div>
                            {localStorage.getItem("aiCode").replace("sql", "")}
                        </div>
                    ) :
                        response.length === 0 ? (
                        isLoading ? (<div><h1 style={{fontSize:'max(15px, 2.5vh)'}}>Loading SQL, please wait...</h1>
                                <PulseLoader color={"black"} loading={isLoading} size={15} margin={4} aria-label="Loading Spinner" data-testid="loader"/></div>)
                            : (<h1 style={{fontSize:'max(15px, 2.5vh)'}}>Upload your image to see code</h1>)
                    ) : (
                        <div>
                            {response.map((msg, index) => (
                                <div key={index}>
                                    <ReactMarkdown>{msg.message}</ReactMarkdown>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="inner-page-box" style={{ width: '28vw', height: '70vh', overflow: 'scroll', marginRight:"-16vh" }}>
                    <textarea
                        value={userSchema}
                        onChange={handleUserSchema}
                        placeholder="Enter your schema"
                        style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 0, outline: 0 }}
                    ></textarea>
                </div>

                <div className="inner-page-box" style={{ width: '28vw', height: '70vh', overflow: 'scroll' }}>
                    {formattedResult}
                </div>
            </div>

            {/*keeping this for now, will get rid of it in a bit (i just think its useful if the other box shows weird input i can look at the og*/}
          {/*  <div className={"inner-page-box"} style={{ width: "80vw", height: "35vh" }}>*/}
          {/*      <h2 style={{ fontSize: "2.5vh" }}>*/}
          {/*          {error*/}
          {/*              ? `Error: ${error}`*/}
          {/*              : diffResult*/}
          {/*                  ? "Comparison Result:"*/}
          {/*                  : "Click Compare After Uploading Your ERD And SQL Code To See Results"}*/}
          {/*      </h2>*/}
          {/*      {diffResult && (*/}
          {/*          <pre*/}
          {/*              style={{*/}
          {/*                  whiteSpace: "pre-wrap",*/}
          {/*                  wordWrap: "break-word",*/}
          {/*                  fontSize: "1.2vh",*/}
          {/*                  maxHeight: "25vh",*/}
          {/*                  overflowY: "auto",*/}
          {/*              }}*/}
          {/*          >*/}
          {/*  {JSON.stringify(diffResult, null, 2)}*/}
          {/*</pre>*/}
          {/*      )}*/}
          {/*  </div>*/}


            <Footer/>
        </>
    );
};

export default CodeEvaluation;