import { useState, ChangeEvent } from "react";
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
import {splitRegExp} from "../src/common/types.ts"
import {compressImageFile} from "../src/common/compress.ts";
import {instruction} from "../src/common/instruction.ts";

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
    const [code, setCode] = useState<string>("");
    const [tableDiffs, setTableDiffs] = useState<string[][]>([]);
    const [equivalentTables, setEquivalentTables] = useState<any[]>([]);
    const [allInfo, setAllInfo] = useState(new Map());

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        localStorage.clear();
        setCode("");
        setResponseString("");
        setResponse("");


        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
        await compressImageFile(file)
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
                            instruction,
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
                    const allParsedLines = splitRegExp(resStr);
                    console.log(allParsedLines);
                    localStorage.setItem("explanation", resStr);
                    // console.log("explanation ", localStorage.getItem("explanation"))
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
                    localStorage.setItem("aiCode", finalCode);
                    setCode(finalCode)
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
        return fkArray.map(pair => pair.join("")).join(", ");
    };



    // function getTableNameDiffs(data, formattedBlocks: any[], startingNum: number) {
    //     const splitting = data.diff[0].split("(this=");
    //     console.log("splitting", splitting);
    //     const rawLine = data.diff[0];
    //     //const match = rawLine.match(/Identifier\(this=([A-Za-z0-9_]+)/);
    //     const regex = /Identifier\(this=([A-Za-z0-9_]+)/g;
    //
    //     const matches = [];
    //     let match;
    //
    //     while ((match = regex.exec(rawLine)) !== null) {
    //         matches.push(match[1]);
    //     }
    //     //const cleanedLine = matches ? `Tables only in schema 1: ${matches}` : rawLine;
    //     const cleanedLine = matches.length > 0
    //         ? `Tables only in schema 1: ${matches.join(", ")}`
    //         : rawLine;
    //     formattedBlocks.push(cleanedLine + "\n");
    //     if (data.diff[1].includes("only")) {
    //         startingNum += 1;
    //         const rawLine2 = data.diff[1];
    //         console.log(data.diff[1]);
    //         const match2 = rawLine2.match(/Identifier\(this=([A-Za-z0-9_]+)/);
    //         const cleanedLine2 = match2 ? `Tables only in schema 2: ${match2[1]}` : rawLine2;
    //         formattedBlocks.push(cleanedLine2);
    //     }
    //     return startingNum;
    // }

    function getAttributeDiffs(bullets: any[], i: number) {
        const rawArr = bullets[i].replace("Attribute differences: ", "").trim();

        const inner = rawArr.slice(1, -1);

        const parts = inner.split(/",\s*"/).map(str => str.replace(/^"|"$/g, ""));
        console.log("parts", parts);

        const diffs = [];
        for (let k = 0; k < parts.length; k++) {
            if (parts[k].includes("only in 1")) {
                diffs[0] = parts[k]
                    .replace(/only in\s+\d:\s*/i, "")
                    .replace(/[\{\}']/g, "")
                    .trim();
            }
            else{
                diffs[1] = parts[k]
                    .replace(/only in\s+\d:\s*/i, "")
                    .replace(/[\{\}']/g, "")
                    .trim();
            }
        }

        let line = "Attribute differences: |";
        if (diffs[0] && diffs[1]) {
            if (diffs[0]) {
                line += `LLM Schema includes ${diffs[0]}`;
            }

            if (diffs[1]) {
                if (diffs[0]) line += " | ";
                line += `User Schema includes ${diffs[1]}`;
            }
        }
        else if (diffs[0] && !diffs[1]) {
            line += `LLM Schema includes ${diffs[0]}`;
        }
        else if (!diffs[0] && diffs[1]) {
            line += `User Schema includes ${diffs[1]}`;

        }

        bullets[i] = line;

        let line2 = [[diffs[0] || ""], [diffs[1] || ""]];
        console.log("line2", line2);
        return line2;

    }

    function getForeignKeyDiffs(bullets: any[], i: number | number) {
        const rawArr = bullets[i].split(":");
        const strSchema1Raw = rawArr[2].replace(/\s*\n\s*schema2/, "");
        const cleaned = strSchema1Raw.trim().replace(/'/g, '"');
        const cleaned2 = rawArr[3].trim().replace(/'/g, '"');

        const arr = JSON.parse(cleaned2);
        const arr2 = JSON.parse(cleaned);


        for (let i = 0; i < arr.length; i++) {
            arr[i][0] =  arr[i][0].replace(",", "");
            arr[i][1] = "(" + arr[i][1] + ")";
        }

        for (let i = 0; i < arr2.length; i++) {
            arr2[i][0] = arr2[i][0].replace(",", "");
            arr2[i][1] = "(" + arr2[i][1] + ")";
        }

        console.log("arr", arr)
        console.log("arr2", arr2)

        const flat1 = arr.map(JSON.stringify);
        const flat2 = arr2.map(JSON.stringify);

        const uniqueToArr1 = flat1.filter(x => !flat2.includes(x)).map(JSON.parse);
        const uniqueToArr2 = flat2.filter(x => !flat1.includes(x)).map(JSON.parse);

        let line = "Foreign Key differences: | ";
        if (uniqueToArr1.length > 0) {
            line += `User Schema includes foreign key(s) that reference ${formatForeignKeys(uniqueToArr1)}`;
        }

        if (uniqueToArr2.length > 0) {
            if (uniqueToArr1) line += " | ";
            line += `LLM Schema includes foreign key(s) that reference ${formatForeignKeys(uniqueToArr2)}`;
        }

        console.log("lined up", line)

        bullets[i] = line;

        const foreignKeyss = [formatForeignKeys(uniqueToArr2), formatForeignKeys(uniqueToArr1)]
        console.log("foreign keyss", foreignKeyss)
        return foreignKeyss;

    }

    function getTableNameDiffs2(data: { diff: string[] }, formattedBlocks: string[], startingNum: number
    ): [number, string[], string[]] {
        let results1: string[] = [];
        let results2: string[] = [];
        const splitting = data.diff[0].split("(this=");
        console.log("splitting", splitting);
        const rawLine = data.diff[0];
        //const match = rawLine.match(/Identifier\(this=([A-Za-z0-9_]+)/);
        const regex = /this=Identifier\(this=([^,)]+)/g;

        const matches = [];
        let match;

        while ((match = regex.exec(rawLine)) !== null) {
            matches.push(match[1]);
        }

        if (data.diff[0].includes("only")) {
            const rawLine1 = data.diff[0];
            const matches1 = [...rawLine1.matchAll(/this=Identifier\(this=([^)]*?)(?=, q|\))/g)];
            results1 = matches1.map(m => m[1]);
            console.log("raw dogging this bro", rawLine1);
            console.log("2 raw dogging this bro ", matches1)
            console.log("results1", results1)
            formattedBlocks.push(`User schema is missing the following tables: ${results1.join(", ")}` + '\n')
        }

        if (data.diff[1].includes("only")) {
            startingNum += 1;
            const rawLine2 = data.diff[1];
            const matches = [...rawLine2.matchAll(/this=Identifier\(this=([^)]*?)(?=, q|\))/g)];
            results2 = matches.map(m => m[1]);
            formattedBlocks.push(`The following tables are not part of the solution: ${results2.join(", ")}` + '\n')
        }
        return [startingNum, results1, results2];
    }

    function hasLetters(st: string): boolean {
        const regex = /[a-zA-Z]/;
        return regex.test(st);
    }

    function cleanUpPK(str: string): string {
        const regex = /this=Identifier\(this=(.*?),/;
        const match = regex.exec(str);
        return match ? match[1] : "";
    }

    function getPrimaryKeyDiffs (bullets: any[], i: number) : string[][] {
        console.log("Get primary key diffs", bullets[i]);
        console.log("before splitted", bullets[i]);
        const splitted = bullets[i].replace("Primary key mismatch:", "").trim().split(/(?=schema\d+:)/);
        console.log("splitted", splitted);

        const aiSchema = splitted[0].split("schema1: ")[1];
        console.log("aiSchema ", aiSchema);

        const userSchema = splitted[1].split("schema2: ")[1];
        console.log("aiSchema 2 ", userSchema);


        let userSchemaPKs;

        // check for ai schema
        if (userSchema.includes("Column")) {
            const temp = userSchema.slice(1, -1).split(/(?=Column\(\s*this=Identifier\(this=)/).map(s => s.trim());
            const pks = [];
            for (const pk of temp) {
                pks.push(cleanUpPK(pk));
            }
            userSchemaPKs = pks.join(", ");
        }
        else if (hasLetters(userSchema)){
            userSchemaPKs = [userSchema.trim().slice(2, -2)];
        }
        else{
            userSchemaPKs = "";
        }

        console.log("USER aiSchema EDITED", userSchemaPKs);

        let aiSchemaPKs;

        // check for ai schema
        if (aiSchema.includes("Column")) {
            const temp = aiSchema.slice(1, -1).split(/(?=Column\(\s*this=Identifier\(this=)/).map(s => s.trim());
            const pks = [];
            for (const pk of temp) {
                pks.push(cleanUpPK(pk));
            }
            aiSchemaPKs = pks.join(", ");
        }
        else if (hasLetters(aiSchema)){
            aiSchemaPKs = aiSchema.trim().slice(2, -2);
        }
        else{
            aiSchemaPKs = "";
        }

        console.log("aiSchema EDITED", aiSchemaPKs);

        const differences = [aiSchemaPKs, userSchemaPKs];
        console.log("differences", differences);

        return differences;
    }


    // function hasLetter(str: string): boolean {
    //     return /[A-Za-z]/.test(str);
    // }

    // function getAdditionalInfo(parsedVers: string[]) {
    //     const tableNames = new Set<string>;
    //     const attributeNames = new Map<number, string[]>
    //     const foreignKeys = new Map<number, [string, string][]>();
    //     let primaryKey = "";
    //     let tableNum = -1;
    //     for (const line of parsedVers) {
    //         if (line.includes("CREATE TABLE")) {
    //             const tableName = line.replace("CREATE TABLE", "").replace("(", "").trim();
    //             console.log("table name", tableName);
    //             tableNames.add(tableName);
    //             tableNum++;
    //         }
    //         // ONLY ACCOUNTS FOR ONE PK RN. ALSO NOT PK ON ITS OWN LINE WITH CONSTRAINT
    //         else if (line.includes("PRIMARY KEY")) {
    //             const amITheGoat = line.replace("PRIMARY KEY", "").split(" ");
    //             for (const goat of amITheGoat) {
    //                 if (goat !== "") {
    //                     primaryKey = goat.trim();
    //                     break;
    //                 }
    //             }
    //             if (attributeNames.has(tableNum)) {
    //                 const current = attributeNames.get(tableNum) ?? [];
    //                 current.push(primaryKey);
    //                 attributeNames.set(tableNum, current);
    //             } else {
    //                 attributeNames.set(tableNum, [primaryKey]);
    //             }
    //             console.log("primaryKey", primaryKey);
    //         }
    //         // HAVE NOT ACCOUNTED FOR FOREIGN KEY AND REFERENCE BEING ON DIFFERENT LINE
    //         else if (line.includes("FOREIGN KEY")) {
    //             console.log("fk!")
    //             console.log(line)
    //             if (line.includes("REFERENCES")) {
    //                 const fk = line.split("REFERENCES");
    //                 console.log("split", fk)
    //                 const actualFK = fk[0].split("FOREIGN KEY")
    //                 const references = fk[1].replace(");", "").replace(",", "");
    //                 const attrFK = actualFK[1].trim().replace("(", "").replace(")", "")
    //                 console.log("attrFK", attrFK);
    //                 console.log("ref", references)
    //                 if (foreignKeys.has(tableNum)) {
    //                     const current = foreignKeys.get(tableNum) ?? [];
    //                     current.push([attrFK, references]);
    //                     foreignKeys.set(tableNum, current);
    //                 } else {
    //                     foreignKeys.set(tableNum, [[attrFK, references]])
    //                 }
    //             }
    //
    //         } else if (line.includes("REFERENCES")) {
    //             console.log(line)
    //         } else {
    //             if (line.length > 0) {
    //                 if (hasLetter(line)) {
    //                     const amITheGoat = line.trim().split(" ");
    //                     if (attributeNames.has(tableNum)) {
    //                         const current = attributeNames.get(tableNum) ?? [];
    //                         current.push(amITheGoat[0]);
    //                         attributeNames.set(tableNum, current);
    //                     } else {
    //                         attributeNames.set(tableNum, [amITheGoat[0]])
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //
    //     console.log("TABLE NAMES", tableNames)
    //     console.log("ATTRIBUTE NAMES", attributeNames)
    //     console.log("FOREIGN KEYS", foreignKeys)
    //     console.log("PRIMARY KEYS", primaryKey)
    //     return tableNames;
    // }

    function editAllInfo(inner: Map<string, string[][]>) {
        type attrType = { key: string; value: string };

        const existsInLLM: attrType[] = [];
        const existsInUser: attrType[] = [];

        ["Attribute", "PrimaryKey", "ForeignKey"].forEach((key) => {
            if (inner.has(key)) {
                const value = inner.get(key)!;

                const llmArr = Array.isArray(value[0]) ? value[0] : [value[0]].filter(Boolean); // removes null, [], and undefined
                const userArr = Array.isArray(value[1]) ? value[1] : [value[1]].filter(Boolean);

                for (const entry of llmArr) {
                    if (entry) {
                        existsInLLM.push({ key, value: entry });
                    }
                }

                for (const entry of userArr) {
                    if (entry) {
                        existsInUser.push({ key, value: entry });
                    }
                }

            }
        });

        const hasLLM = existsInLLM.length > 0;
        const hasUser = existsInUser.length > 0;

        return (
            <div>
                {hasLLM && (
                    <div>
                        <h2 className="text-left font-bold text-md">Only in LLM:</h2>
                        <ul className="list-disc text-left pl-5">
                            {existsInLLM.map((item, i) => (
                                <li key={i}>
                                    {item.key} {item.value}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {hasUser && (
                    <div>
                        <h2 className="text-left font-bold text-md">Only in User:</h2>
                        <ul className="list-disc pl-5 text-left">
                            {existsInUser.map((item, i) => (
                                <li key={i}>
                                    {item.key} {item.value}
                                </li>
                            ))}
                        </ul>
                        <br />
                    </div>
                )}
            </div>
        );
    }




    const handleCompare = async () => {
        console.log("SIJFIDOSFVOIAKDFOIAKDIFAWNIDFEHNWAKFEWDNAJFENDFLJNEWDS")
        setLoading(true);
        setError(null);
        setDiffResult(null);

        let schema1 = "";
        if (localStorage.getItem("aiCode") !== null && response.length < 1) {
            schema1 = localStorage.getItem("aiCode") as string;
        }
        else if (response.length > 0){
            schema1 = code
            localStorage.setItem("aiCode", code);
        }
        else{
            schema1 = ""
        }

        schema1.replace("sql", "")
        schema1.replace("`", "")

        console.log("=============================================================================================")
        console.log("AI SCHEMA", schema1);
        console.log("USER", userSchema);
        const cleanedSchema = schema1
            .replace(/^```sql\s*/, '')
            .replace("```", '')
            .trim();

        console.log(cleanedSchema)
        try {
            const res = await fetch("http://localhost:8080/api/compare", {
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
            console.log(data.diff)
            setDiffResult(data.diff);

            const formattedBlocks = [];
            const tableNameDiffs = [];
            const equivalentTables = [];
            const allInfo = new Map<string, Map<string, string[][]>>;


            if(data.diff){
                // const parsedVersUser = userSchema.split("\n");
                // console.log("parsed", parsedVersUser);
                // const parsedVersLLM = cleanedSchema.split("\n");

                // const userTables = getAdditionalInfo(parsedVersUser);
                // const LLMTables = getAdditionalInfo(parsedVersLLM);
                //
                // const numLLM = `Number of Tables in LLM Schema : ${LLMTables.size}` + '\n';
                // const numUser = `Number of Tables in User Schema : ${userTables.size}` + '\n';
                //
                // const numbers = [numLLM, numUser];

                let startingNum = 0;
                if (!data.diff[0].includes("Comparing")){
                    startingNum += 1;
                    const results = getTableNameDiffs2(data, tableNameDiffs, startingNum);
                    console.log("resultssss", results);
                    startingNum = results[0];
                    setTableDiffs([results[1], results[2]]);
                }
                for (; startingNum < data.diff.length; startingNum += 4) {
                    if (data.diff[startingNum].includes("Comparing")) {
                        const header = data.diff[startingNum];
                        console.log("HEADER", header);
                        const tableName = header.replace("Comparing table:", "").trim();
                        let bullets = [data.diff[startingNum + 1], data.diff[startingNum + 2], data.diff[startingNum + 3]];

                        for (let i = 0; i < 3; i++) {
                            if (!bullets[i].includes("same")) {
                                if (i === 0) {
                                    const attrDiff = getAttributeDiffs(bullets, i);
                                    const innerMap = new Map<string, string[][]>();
                                    innerMap.set("Attribute", attrDiff);
                                    allInfo.set(tableName, innerMap);
                                }
                                if (i == 1){
                                    const pkDiff = getPrimaryKeyDiffs(bullets, i)
                                    let innerMap = allInfo.get(tableName);

                                    if (!innerMap) {
                                        innerMap = new Map<string, string[][]>();
                                        allInfo.set(tableName, innerMap);
                                    }

                                    innerMap.set("PrimaryKey", pkDiff);
                                }
                                if (i === 2) {
                                    const fkDiff = getForeignKeyDiffs(bullets, i);
                                    let innerMap = allInfo.get(tableName);

                                    if (!innerMap) {
                                        innerMap = new Map<string, string[][]>();
                                        allInfo.set(tableName, innerMap);
                                    }

                                    innerMap.set("ForeignKey", fkDiff);
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
                            equivalentTables.push(tableName);

                        }



                        formattedBlocks.push(
                            <div key={startingNum}>

                                <h2 className="font-bold text-xl">{header}</h2>
                                <ul>
                                    {bullets.map((b, j) => {
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
                                                    <li key={j} className={"font-bold"}>
                                                        {before}mismatch:<br />
                                                        Schema1: [{columnNames.join(", ")}]<br />
                                                        Schema2: {schema2}
                                                    </li>
                                                );
                                            } else {
                                                const after = afterRaw.replace(/\s*schema2:/, "User schema has").replace(/[\[\]]/g, "").replace(/\s*schema1:/, "LLM has");
                                                console.log("afterr", after);
                                                return (
                                                    <li key={j} className={" "}>
                                                        <div className={"font-bold"}>{before}mismatch:<br /> </div>
                                                        {after}
                                                    </li>
                                                );
                                            }
                                        }
                                        else if (b.includes("Attribute differences:")) {
                                            const test = b.split("|");
                                            return (
                                                <ul className={""}>
                                                    {test.map((item, index) => (
                                                        <li key={index} className={index === 0 ? "font-bold" : ""} >{item} </li>
                                                    ))}
                                                </ul>
                                            );
                                        }
                                        else if (b.includes("Foreign Key differences:")) {
                                            const test = b.split("|");
                                            return (
                                                <ul className={""}>
                                                    {test.map((item, index) => (
                                                        <li key={index} className={index === 0 ? "font-bold" : ""}>{item} </li>
                                                    ))}
                                                </ul>
                                            );
                                        }
                                        else {
                                            return <li key={j} >{b}</li>;
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

            console.log("Equivalent tables", equivalentTables);
            setEquivalentTables(equivalentTables);
            console.log("non equivalent", tableDiffs);
            setAllInfo(allInfo)
            console.log("DID THIS DO WHAT I WANTED IT TO DO mapmap", allInfo);


        } catch (e) {
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

            <div id="input-container" className={"bg-[#e7e7e7] p-4 mx-27 rounded-md border-[2px] border-[#BD0A0A] mt-10 flex items-center"} >

                <input
                    type="file"
                    accept=".png,.jpg"
                    onChange={handleFileUpload}
                    className="chat-input bg-gray-100 flex-grow mr-4"
                    style={{fontSize:'2vh'}}
                />

                <button className="cursor-pointer clear-btn bg-[#BD0A0A] hover:bg-[#700606] text-white mx-4" onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                }}>
                    Clear
                </button>

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
            </div>



            <div className={"flex"} style={{marginTop:"2vh"}}>
                <h2 className={"w-2/5 font-bold "}>LLM Code</h2>
                <h2 className={"w-1/5 font-bold"}>Your Code</h2>
                <h2 className={"w-2/5 font-bold"}>Comparison</h2>
            </div>

            <div style={{ height: '75vh', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', marginTop:"-2vh"}}>
                <div className="inner-page-box" style={{ width: '28vw', height: '70vh', overflow: 'scroll', marginRight:"-16vh", textAlign: 'left' }}>
                    {localStorage.getItem("aiCode") !== null && code.length === 0 ? (
                        <div>
                            <pre
                                style={{
                                    margin: 0,
                                    fontSize: '15px',
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
                        </div>
                    ) :
                        response.length === 0 ? (
                        isLoading ? (<div><h1 style={{fontSize:'max(15px, 2.5vh)'}}>Loading SQL, please wait...</h1>
                                <PulseLoader color={"black"} loading={isLoading} size={15} margin={4} aria-label="Loading Spinner" data-testid="loader"/></div>)
                            : (<h1 style={{fontSize:'max(15px, 2.5vh)'}}>Upload your image to see code</h1>)
                    ) : (
                        <div>
                            <pre
                                style={{
                                    margin: 0,
                                    fontSize: '15px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere',
                                    textAlign: 'left'
                                }}
                            >
                                {code ?
                                    (code
                                    ) : (
                                        localStorage.getItem("aiCode")
                                    )
                                }
                            </pre>
                        </div>
                    )}
                </div>

                <div className="inner-page-box" style={{ width: '28vw', height: '70vh', overflow: 'scroll', marginRight:"-16vh" }}>
                    <textarea
                        value={userSchema}
                        onChange={handleUserSchema}
                        placeholder="Enter your schema"
                        style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 0, outline: 0, fontFamily: 'monospace', fontSize: '15px' }}
                    ></textarea>
                </div>

                <div className="inner-page-box" style={{ width: '28vw', height: '70vh', overflow: 'scroll' }}>
                    {equivalentTables.length > 0 ? (
                        <div>
                            <h2 className={"text-left font-bold text-xl"}>Correct User Schemas:</h2>
                            <div className={"list-disc pl-5 text-left"}>
                                {equivalentTables.map((diff, index) => (
                                    <li key={index} className={"text-left"}>{diff}</li>
                                ))}
                            </div>
                            <br></br>
                        </div>
                    ) : (<div></div>)}

                    {tableDiffs[0]?.length > 0 && (
                        <div>
                            <h2 className="text-left font-bold text-xl">
                                User Schema is missing the following tables:
                            </h2>
                            <div className="list-disc pl-5 text-left">
                                {tableDiffs[0]?.map((diff, index) => (
                                    <li key={index} className="text-left">{diff}</li>
                                ))}
                            </div>
                            <br></br>
                        </div>
                    )}


                    {tableDiffs[1]?.length > 0 && (
                        <div>
                            <h2 className="text-left font-bold text-xl">
                                LLM Schema is missing the following tables:
                            </h2>
                            <div className="list-disc pl-5 text-left">
                                {tableDiffs[1]?.map((diff, index) => (
                                    <li key={index} className="text-left">{diff}</li>
                                ))}
                            </div>
                            <br></br>
                        </div>
                    )}


                    {allInfo.size > 0 ?(
                        <div>
                            <h2 className={"text-left font-bold text-xl"}>Attributes do not match in these tables:</h2>
                            <div className={""}>
                                <div>
                                    {Array.from(allInfo.entries()).map(([key, value]) => (
                                        <div key={key}>
                                            <h2 className={"text-lg text-left font-bold"}>{key}</h2>
                                            {editAllInfo(value)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div></div>
                    )}


                </div>
            </div>

            <Footer/>
        </>
    );
};

export default CodeEvaluation;