import React, { useState} from "react";
type ShapeType = "Entity" | "Attribute" | "Relationship" | "Unknown";
import wpiLogo from "./images/wpiLogo.png";

    interface Shape {
        id: string;
        label: string;
        type: ShapeType;
        isKey?: boolean;
        isWeak?: boolean;
    }
    
    interface Connection {
        from: string;
        to: string;
        isWeak?: boolean;
        label?: string;
    }
    function sanitizeName(name: string): string {
        return name
            .trim()
            .replace(/\s+/g, '_')        // Replace spaces with underscores
            .replace(/[^a-zA-Z0-9_]/g, '') // Remove all non-alphanum/underscore
            .replace(/^(\d)/, '_$1');    // Prefix leading digits with underscore
    }


    function App() {
        // @ts-ignore
        const [entities, setEntities] = useState<Record<string, Shape>>({});
        const [attributesByEntity, setAttributesByEntity] = useState<Record<string, {label: string, isKey: boolean}[]>>({});
        const [relationships, setRelationships] = useState<
            { name: string; entities: string[]; isWeak?: boolean, cardinality: string[] }[]
        >([]);
        // @ts-ignore
        const [debugInfo, setDebugInfo] = useState<string>("");
        const [isLoading, setIsLoading] = useState(false);


        const parseLabel = (rawLabel: string) => {
            // only get text content
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = rawLabel;
    
            // check if has underline
            const hasUnderline = rawLabel.includes("<u>") || rawLabel.includes("<U>");
    
            // clean text
            const cleanText = tempDiv.textContent || tempDiv.innerText || "";
    
            return {
                text: cleanText.trim(),
                isKey: hasUnderline
            };
        };

        const [parsedXML, setParsedXML] = useState<Document | null>(null);


        const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
    
            setIsLoading(true);
            setDebugInfo("Processing file...");
    
            try {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const xmlText = event.target?.result as string;

                    setDebugInfo(`File loaded, size: ${xmlText.length} characters`);
    
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
                    // errs?
                    const parseError = xmlDoc.getElementsByTagName("parsererror");
                    if (parseError.length > 0) {
                        setDebugInfo("XML parsing error: " + parseError[0].textContent);
                        setIsLoading(false);
                        return;
                    }

                    setParsedXML(xmlDoc);

                    const cells = Array.from(xmlDoc.getElementsByTagName("mxCell"));
                    setDebugInfo(`Found ${cells.length} cells`);
                    console.log("CELLS:");
                    cells.forEach((cell, i) => {
                        const id = cell.getAttribute("id");
                        const style = cell.getAttribute("style") || "";
                        const value = cell.getAttribute("value") || "";
                        const isEdge = cell.getAttribute("edge") === "1";
                        const source = cell.getAttribute("source");
                        const target = cell.getAttribute("target");
                        const parent = cell.getAttribute("parent");

                        const isWeak =
                            !isEdge && (
                                style.includes("strokeWidth=2") ||
                                style.includes("dashed=1") ||
                                value.toLowerCase().includes("weak")
                            );

                        // Only log edges or cells that have a visible label
                        if (isEdge || value.trim() || parent) {
                            console.log(`[${i}] ID: ${id}`);
                            console.log(`   Value: ${value}`);
                            console.log(`   Style: ${style}`);
                            console.log(`   IsEdge: ${isEdge}`);
                            console.log(`   isWeak: ${isWeak}`);
                            console.log(`   Parent: ${parent || "(none)"}`);
                            if (isEdge) {
                                console.log(`   Source: ${source}, Target: ${target}`);
                            }
                        }
                    });

                    const shapeMap: Record<string, Shape> = {};
                    const edges: Connection[] = [];
                    const edgeLabels: Record<string, string[]> = {};


                    for (const cell of cells) {
                        const id = cell.getAttribute("id");
                        const style = cell.getAttribute("style") || "";
                        let value = cell.getAttribute("value") || "";
    
                        // parse text to get info
                        const labelInfo = parseLabel(value);
                        value = labelInfo.text;
    
                        // check if key (check for <u> tag or wtv the underline is)
                        const isKey = labelInfo.isKey ||
                            style.includes("text-decoration-line:underline") ||
                            style.includes("textDecoration=underline") ||
                            style.includes("fontStyle=4") ||
                            style.includes("text-decoration:underline");
    
                        if (!id) continue;
    
                        let type: ShapeType = "Unknown";
                        let isWeak = false;


                        if (style.includes("shape=doubleEllipse")) {
                            type = "Attribute";
                            isWeak = true;
                        } else if (style.includes("ellipse")) {
                            type = "Attribute";
                        } else if (style.includes("shape=rhombus") && style.includes("double=1")) {
                            type = "Relationship";
                            isWeak = true;
                        } else if (style.includes("shape=rhombus")) {
                            type = "Relationship";
                        } else if (style.includes("shape=ext") && style.includes("double=1")) {
                            type = "Entity";
                            isWeak = true;
                        } else if (style.includes("rounded=1") && style.includes("arcSize=10")) {
                            type = "Entity";
                        } else if (
                            style.includes("shape=rectangle") ||
                            style.includes("rounded=1") ||
                            style.includes("arcSize=10") ||
                            style.includes("whiteSpace=wrap")
                        ) {
                            type = "Entity";
                        } else if (
                            style.includes("whiteSpace=wrap") &&
                            style.includes("html=1") &&
                            style.includes("align=center")
                        ) {
                            type = "Entity";
                        }


                        // only add if there's a value in it
                        if (type !== "Unknown" && value.trim()) {
                            shapeMap[id] = { id, label: value.trim(), type, isKey, isWeak };
                        }
                    }

                    // Edge label children (like "1", "N" for cardinality)
                    for (const cell of cells) {
                        const parentId = cell.getAttribute("parent");
                        const isEdgeChild = parentId && !cell.getAttribute("source") && !cell.getAttribute("target");

                        if (isEdgeChild) {
                            const label = parseLabel(cell.getAttribute("value") || "").text;

                            if (label) {
                                console.log(`Edge Label: "${label}" on Edge ID: ${parentId}`);
                                // Optional: store in edgeLabels map
                                if (!edgeLabels[parentId]) edgeLabels[parentId] = [];
                                edgeLabels[parentId].push(label);
                            }
                        }
                    }

                    // get lines (the edges)
                    for (const cell of cells) {
                        const isEdge = cell.getAttribute("edge") === "1";

                        if (isEdge) {
                            const source = cell.getAttribute("source");
                            const target = cell.getAttribute("target");

                            if (source && target) {
                                const edgeId = cell.getAttribute("id") || "";
                                const label = edgeId && edgeLabels[edgeId]?.join(", ");

                                const connection: Connection = {
                                    from: source,
                                    to: target,
                                    ...(label && { label })
                                };

                                edges.push(connection);
                            }


                        }
                    }


    
                    setDebugInfo(`Found ${Object.keys(shapeMap).length} shapes and ${edges.length} edges`);
    
                    // stores attribute with key
                    const entityAttributeDetails: Record<string, {label: string, isKey: boolean}[]> = {};
                    const relationshipLinks: Record<string, [string, string][]> = {};


                    console.log("Expanded Edges with Labels:");
                    edges.forEach((edge, index) => {
                        const fromShape = shapeMap[edge.from];
                        const toShape = shapeMap[edge.to];

                        const fromLabel = fromShape ? `${fromShape.label} (${fromShape.type})` : `Unknown (${edge.from})`;
                        const toLabel = toShape ? `${toShape.label} (${toShape.type})` : `Unknown (${edge.to})`;

                        console.log(`[${index}] ${fromLabel} ---> ${toLabel}`);
                    });


                    for (const edge of edges) {
                        const from = shapeMap[edge.from];
                        const to = shapeMap[edge.to];
    
                        if (!from || !to) continue;
    
                        // entity attributes
                        if (from.type === "Entity" && to.type === "Attribute") {
                            if (!entityAttributeDetails[from.label]) entityAttributeDetails[from.label] = [];
                            entityAttributeDetails[from.label].push({label: to.label, isKey: to.isKey || false});
                        } else if (to.type === "Entity" && from.type === "Attribute") {
                            if (!entityAttributeDetails[to.label]) entityAttributeDetails[to.label] = [];
                            entityAttributeDetails[to.label].push({label: from.label, isKey: from.isKey || false});
                        }
    
                        // entity relationships
                        if (
                            (from.type === "Entity" && to.type === "Relationship") ||
                            (to.type === "Entity" && from.type === "Relationship")
                        ) {
                            const entity = from.type === "Entity" ? from : to;
                            const relationship = from.type === "Relationship" ? from : to;
                            const label = edge.label || "";  // cardinality label (may be "1", "N", etc.)

                            if (!relationshipLinks[relationship.label]) relationshipLinks[relationship.label] = [];
                            relationshipLinks[relationship.label].push([entity.label, label]);
                        }

                    }
    
                    // store results
                    setEntities(shapeMap);
                    console.log("Shape Map:", shapeMap);
                    setAttributesByEntity(entityAttributeDetails);
                    console.log("Attributes by Entity:");
                    Object.entries(entityAttributeDetails).forEach(([entity, attrs]) => {
                        console.log(`Entity: ${entity}`);
                        attrs.forEach(attr => {
                            console.log(`  - Attribute: ${attr.label}, isKey: ${attr.isKey}`);
                        });
                    });

                    const relationshipArray = Object.entries(relationshipLinks).map(([name, ents]) => {
                        const shape = Object.values(shapeMap).find(
                            (s) => s.label === name && s.type === "Relationship"
                        );

                        return {
                            name,
                            entities: ents.map(([entity, cardinality]) => entity),
                            cardinality: ents.map(([_, cardinality]) => cardinality),
                            isWeak: shape?.isWeak
                        };
                    });


                    setRelationships(relationshipArray);
                    console.log("Final Relationships Array:\n", JSON.stringify(relationshipArray, null, 2));


                    setDebugInfo(`Processed: ${Object.keys(entityAttributeDetails).length} entities with attributes, ${relationshipArray.length} relationships`);
                    setIsLoading(false);
                };
    
                reader.readAsText(file);
            } catch (error) {
                setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setIsLoading(false);
            }
        };
        const generateSQLSchema = (): string => {
            let sql = "";
            const definedTables = new Set<string>();

            // Step 1: Extract primary keys
            const pkMap: Record<string, string> = {};
            for (const [entityName, attributes] of Object.entries(attributesByEntity)) {
                const keyAttr = attributes.find(attr => attr.isKey);
                if (keyAttr) {
                    pkMap[sanitizeName(entityName)] = sanitizeName(keyAttr.label);
                }
            }

            // Step 2: Track foreign key columns for 1:N and 1:1
            const foreignKeys: Record<string, { column: string; refTable: string; refColumn: string }[]> = {};

            for (const rel of relationships) {
                if (rel.entities.length !== 2) continue;

                const [entityA, entityB] = rel.entities;
                const [cardA, cardB] = rel.cardinality;

                const tableA = sanitizeName(entityA);
                const tableB = sanitizeName(entityB);
                const pkA = pkMap[tableA];
                const pkB = pkMap[tableB];

                if (!pkA || !pkB) continue;

                if ((cardA === "1" && cardB === "N") || (cardA === "N" && cardB === "1")) {
                    const oneSide = cardA === "1" ? tableA : tableB;
                    const manySide = cardA === "1" ? tableB : tableA;
                    const pk = pkMap[oneSide];

                    if (!foreignKeys[manySide]) foreignKeys[manySide] = [];
                    foreignKeys[manySide].push({
                        column: `${oneSide.toLowerCase()}_id`,
                        refTable: oneSide,
                        refColumn: pk,
                    });
                } else if (cardA === "1" && cardB === "1") {
                    if (!foreignKeys[tableB]) foreignKeys[tableB] = [];
                    foreignKeys[tableB].push({
                        column: `${tableA.toLowerCase()}_id`,
                        refTable: tableA,
                        refColumn: pkA,
                    });
                }
            }

            // Step 3: Create entity tables with inline FK definitions
            for (const [entityName, attributes] of Object.entries(attributesByEntity)) {
                const tableName = sanitizeName(entityName);
                definedTables.add(tableName);

                const fields: string[] = attributes.map(attr => {
                    const name = sanitizeName(attr.label);
                    const type = attr.isKey ? "INT" : "VARCHAR(255)";
                    const pk = attr.isKey ? " PRIMARY KEY" : "";
                    return `  ${name} ${type}${pk}`;
                });

                if (foreignKeys[tableName]) {
                    foreignKeys[tableName].forEach(fk => {
                        fields.push(`  ${fk.column} INT`);
                    });
                }

                sql += `CREATE TABLE ${tableName} (\n`;
                sql += fields.join(",\n");

                if (foreignKeys[tableName]) {
                    const constraints = foreignKeys[tableName].map(fk =>
                        `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.refTable}(${fk.refColumn})`
                    );
                    sql += ",\n" + constraints.join(",\n");
                }

                sql += `\n);\n\n`;
            }

            // Step 4: Join tables for M:N relationships
            for (const rel of relationships) {
                if (rel.entities.length !== 2) continue;

                const [entityA, entityB] = rel.entities;
                const [cardA, cardB] = rel.cardinality;

                if (cardA === "N" && cardB === "N") {
                    const joinTable = sanitizeName(rel.name);
                    if (definedTables.has(joinTable)) continue;

                    const tableA = sanitizeName(entityA);
                    const tableB = sanitizeName(entityB);
                    const pkA = pkMap[tableA];
                    const pkB = pkMap[tableB];

                    if (!pkA || !pkB) continue;

                    sql += `CREATE TABLE ${joinTable} (\n`;
                    sql += `  ${tableA.toLowerCase()}_id INT,\n`;
                    sql += `  ${tableB.toLowerCase()}_id INT,\n`;
                    sql += `  FOREIGN KEY (${tableA.toLowerCase()}_id) REFERENCES ${tableA}(${pkA}),\n`;
                    sql += `  FOREIGN KEY (${tableB.toLowerCase()}_id) REFERENCES ${tableB}(${pkB})\n`;
                    sql += `);\n\n`;

                    definedTables.add(joinTable);
                }
            }

            return sql;
        };




        const entityCount = Object.keys(attributesByEntity).length;
/*
        const entitiesWithNoAttributes = Object.values(entities).filter(
            (shape) => shape.type === "Entity" && !attributesByEntity[shape.label]
        );

        const relationshipCount = relationships.length;
        const totalShapes = Object.keys(entities).length;
*/



        return (
            <div>
                {/* Navbar */}
                <div className="relative mx-auto p-1 bg-[#c31432] flex items-center justify-between h-20">
                    <div className="flex items-center z-10">
                        <img
                            className="h-12 mx-1 object-scale-down"
                            src={wpiLogo}
                            alt="WPI Logo"
                        />
                        <div className="text-5xl font-bold text-white font-serif">
                            WPI
                        </div>
                    </div>
                    <h1 className="absolute left-1/2 transform -translate-x-1/2 text-5xl font-bold text-white font-serif tracking-wide">
                        ESAPT
                    </h1>
                </div>

                <div className={"relative mx-auto p-1 flex items-center justify-between h-15"}>
                    <div className="my-3 mb-1 mx-10 flex w-[45%] relative">
                        <label className="text-sm font-medium  text-gray-700 my-2">
                            ONLY A .DRAWIO FILE
                        </label>

                        <input
                            type="file"
                            accept=".drawio,.xml"
                            onChange={handleFileUpload}
                            className="absolute right-0 ml-10 block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {isLoading && <p className="mt-2 text-blue-600">loading...</p>}
                    </div>

                    {entityCount > 0 && (
                        <div className="my-3 mb-1 mx-10 flex">
                            <button
                                className=" px-4 py-2 bg-[#c53a52] text-white rounded hover:bg-[#c31534]"
                                onClick={() => {
                                    const sql = generateSQLSchema();
                                    const blob = new Blob([sql], { type: "text/plain" });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = "schema.sql";
                                    link.click();
                                    URL.revokeObjectURL(url);
                                }}
                            >
                                Download SQL Schema
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex">
                    {/*first half*/}
                    <div className="flex flex-col h-[80vh] w-1/2">
                        <div className="flex flex-col h-full mx-10  mt-2 shadow-2xl border-[3px] border-[#c31432] rounded-md bg-white overflow-hidden">
                            <div className="flex-1 overflow-auto p-4">
                                <pre className="whitespace-pre-wrap break-words">
                                    {parsedXML
                                        ? parsedXML.documentElement.outerHTML
                                        : "No file has been uploaded or parsed yet."}
                                </pre>
                            </div>
                        </div>
                    </div>


                    {/*second half*/}
                    <div className="flex flex-col h-[80vh] w-1/2">
                        <div className="flex flex-col h-full  mx-10 mt-2 shadow-2xl border-[3px] border-[#c31432] rounded-md bg-white overflow-hidden">
                            <div className="flex-1 overflow-auto p-4">
                                <pre className="whitespace-pre-wrap break-words">
                                    {parsedXML
                                        ? generateSQLSchema()
                                        : "No SQL Schemas to generate."}
                                </pre>
                            </div>


                            {/*<div className={""}>*/}
                            {/*    {entitiesWithNoAttributes.length > 0 && (*/}
                            {/*        <div className="mb-8">*/}
                            {/*            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Entities Without Attributes</h2>*/}
                            {/*            <ul className="list-disc list-inside text-gray-700">*/}
                            {/*                {entitiesWithNoAttributes.map((entity) => (*/}
                            {/*                    <li key={entity.id}>{entity.label}</li>*/}
                            {/*                ))}*/}
                            {/*            </ul>*/}
                            {/*        </div>*/}
                            {/*    )}*/}


                            {/*    /!*<div>*!/*/}
                            {/*    /!*    {entityCount > 0 && (*!/*/}
                            {/*    /!*        <div className="mb-8">*!/*/}
                            {/*    /!*            <h2 className="text-2xl font-semibold text-gray-800 mb-4">ENTITIES AND ATTRIBUTES</h2>*!/*/}
                            {/*    /!*            <div className="space-y-3">*!/*/}
                            {/*    /!*                {Object.entries(attributesByEntity).map(([entity, attrs]) => {*!/*/}
                            {/*    /!*                    const keys = attrs.filter(attr => attr.isKey);*!/*/}
                            {/*    /!*                    const regularAttrs = attrs.filter(attr => !attr.isKey);*!/*/}

                            {/*    /!*                    return (*!/*/}
                            {/*    /!*                        <div key={entity} className="p-4 border border-gray-200 rounded-lg">*!/*/}
                            {/*    /!*                            <h3 className="font-bold text-lg text-blue-600 mb-3">{entity}</h3>*!/*/}

                            {/*    /!*                            {keys.length > 0 && (*!/*/}
                            {/*    /!*                                <div className="mb-2">*!/*/}
                            {/*    /!*                                    <span className="font-semibold text-yellow-800">Key: </span>*!/*/}
                            {/*    /!*                                    <span className="text-gray-700">*!/*/}
                            {/*    /!*                    {keys.map(key => key.label).join(', ')}*!/*/}
                            {/*    /!*                </span>*!/*/}
                            {/*    /!*                                </div>*!/*/}
                            {/*    /!*                            )}*!/*/}

                            {/*    /!*                            {regularAttrs.length > 0 && (*!/*/}
                            {/*    /!*                                <div className="mb-2">*!/*/}
                            {/*    /!*                                    <span className="font-semibold text-gray-800">Attributes: </span>*!/*/}
                            {/*    /!*                                    <span className="text-gray-700">*!/*/}
                            {/*    /!*                    {regularAttrs.map(attr => attr.label).join(', ')}*!/*/}
                            {/*    /!*                </span>*!/*/}
                            {/*    /!*                                </div>*!/*/}
                            {/*    /!*                            )}*!/*/}

                            {/*    /!*                            {attrs.length === 0 && (*!/*/}
                            {/*    /!*                                <p className="text-gray-500 text-sm">No attributes found</p>*!/*/}
                            {/*    /!*                            )}*!/*/}
                            {/*    /!*                        </div>*!/*/}
                            {/*    /!*                    );*!/*/}
                            {/*    /!*                })}*!/*/}
                            {/*    /!*            </div>*!/*/}
                            {/*    /!*        </div>*!/*/}
                            {/*    /!*    )}*!/*/}
                            {/*    /!*</div>*!/*/}
                            {/*    /!*{relationshipCount > 0 && (*!/*/}
                            {/*    /!*    <div className="mb-8">*!/*/}
                            {/*    /!*        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Relationships</h2>*!/*/}
                            {/*    /!*        <div className="space-y-3">*!/*/}
                            {/*    /!*            {relationships.map((rel, i) => (*!/*/}
                            {/*    /!*                <div key={i} className="p-4 border border-gray-200 rounded-lg">*!/*/}
                            {/*    /!*                    <h3 className="font-bold text-lg text-green-600 mb-2">*!/*/}
                            {/*    /!*                        {rel.name} {rel.isWeak && <span className="text-red-500 text-sm">(weak)</span>}*!/*/}
                            {/*    /!*                    </h3>*!/*/}
                            {/*    /!*                    <p className="text-gray-700">*!/*/}
                            {/*    /!*                        {rel.entities.join(" <--> ")}*!/*/}
                            {/*    /!*                    </p>*!/*/}
                            {/*    /!*                </div>*!/*/}
                            {/*    /!*            ))}*!/*/}
                            {/*    /!*        </div>*!/*/}
                            {/*    /!*    </div>*!/*/}
                            {/*    /!*)}*!/*/}

                            {/*    /!*{totalShapes === 0 && !isLoading && (*!/*/}
                            {/*    /!*    <div className="text-center py-12">*!/*/}
                            {/*    /!*        <p className="text-gray-500">ONLY A .DRAWIO FILE</p>*!/*/}
                            {/*    /!*    </div>*!/*/}
                            {/*    /!*)}*!/*/}

                            {/*    /!*{totalShapes > 0 && entityCount === 0 && relationshipCount === 0 && (*!/*/}
                            {/*    /!*    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">*!/*/}
                            {/*    /!*        <h3 className="font-semibold text-yellow-800 mb-2">no elements found</h3>*!/*/}
                            {/*    /!*        <p className="text-yellow-700 text-sm">*!/*/}
                            {/*    /!*            {totalShapes} shapes, but no entities or relationships were detected. MAKE SURE IT'S ALL PROPERLY CONNECTED*!/*/}
                            {/*    /!*        </p>*!/*/}
                            {/*    /!*    </div>*!/*/}
                            {/*    /!*)}*!/*/}
                            {/*    /!*{entityCount > 0 && (*!/*/}
                            {/*    /!*    <div className="my-8">*!/*/}
                            {/*    /!*        <h2 className="text-xl font-bold mb-2 text-gray-800">SQL Schema Output</h2>*!/*/}
                            {/*    /!*        <button*!/*/}
                            {/*    /!*            className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"*!/*/}
                            {/*    /!*            onClick={() => {*!/*/}
                            {/*    /!*                const sql = generateSQLSchema();*!/*/}
                            {/*    /!*                const blob = new Blob([sql], { type: "text/plain" });*!/*/}
                            {/*    /!*                const url = URL.createObjectURL(blob);*!/*/}
                            {/*    /!*                const link = document.createElement("a");*!/*/}
                            {/*    /!*                link.href = url;*!/*/}
                            {/*    /!*                link.download = "schema.sql";*!/*/}
                            {/*    /!*                link.click();*!/*/}
                            {/*    /!*                URL.revokeObjectURL(url);*!/*/}
                            {/*    /!*            }}*!/*/}
                            {/*    /!*        >*!/*/}
                            {/*    /!*            Download SQL Schema*!/*/}
                            {/*    /!*        </button>*!/*/}
                            {/*    /!*    </div>*!/*/}
                            {/*    /!*)}*!/*/}

                            {/*    /!*{entityCount > 0 && (*!/*/}
                            {/*    /!*    <div className="my-8">*!/*/}
                            {/*    /!*        <h2 className="text-xl font-bold mb-2 text-gray-800">Prisma Schema Output</h2>*!/*/}
                            {/*    /!*        <button*!/*/}
                            {/*    /!*            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"*!/*/}
                            {/*    /!*            onClick={() => {*!/*/}
                            {/*    /!*                const schema = generatePrismaSchema();*!/*/}
                            {/*    /!*                const blob = new Blob([schema], { type: "text/plain" });*!/*/}
                            {/*    /!*                const url = URL.createObjectURL(blob);*!/*/}
                            {/*    /!*                const link = document.createElement("a");*!/*/}
                            {/*    /!*                link.href = url;*!/*/}
                            {/*    /!*                link.download = "schema.prisma";*!/*/}
                            {/*    /!*                link.click();*!/*/}
                            {/*    /!*                URL.revokeObjectURL(url);*!/*/}
                            {/*    /!*            }}*!/*/}
                            {/*    /!*        >*!/*/}
                            {/*    /!*            Download Prisma Schema*!/*/}
                            {/*    /!*        </button>*!/*/}
                            {/*    /!*    </div>*!/*/}
                            {/*    /!*)}*!/*/}
                            {/*</div>*/}
                        </div>
                    </div>
                </div>

                {/*<div className={"bg-purple-500"}>*/}

                {/*    <div className="mb-6">*/}
                {/*    <label className="block text-sm font-medium text-gray-700 mb-2">*/}
                {/*            ONLY A .DRAWIO FILE (it should be XML if you export it, BUT CAN'T BE COMPRESSED)*/}
                {/*        </label>*/}
                {/*        <input*/}
                {/*            type="file"*/}
                {/*            accept=".drawio,.xml"*/}
                {/*            onChange={handleFileUpload}*/}
                {/*            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"*/}
                {/*        />*/}
                {/*        {isLoading && <p className="mt-2 text-blue-600">loading...</p>}*/}
                {/*    </div>*/}

                {/*    <div className="mb-6 bg-pink-500">*/}
                {/*        {debugInfo && (*/}
                {/*            <div className="mb-6 p-4 bg-gray-100 rounded-lg">*/}
                {/*                <h3 className="font-semibold text-gray-700 mb-2">hello???</h3>*/}
                {/*                <p className="text-sm text-gray-600">{debugInfo}</p>*/}
                {/*            </div>*/}
                {/*        )}*/}

                {/*        {totalShapes > 0 && (*/}
                {/*            <div className="mb-6 p-4 bg-blue-50 rounded-lg">*/}
                {/*                <h3 className="font-semibold text-blue-800 mb-2">summary</h3>*/}
                {/*                <p className="text-sm text-blue-700">*/}
                {/*                    {totalShapes} total shapes, {entityCount} entities, {relationshipCount} relationships*/}
                {/*                </p>*/}
                {/*            </div>*/}
                {/*        )}*/}
                {/*    </div>*/}
                {/*</div>*/}


                {/*<div</div>*/}

                <footer className="relative mx-auto p-1 mt-10 bg-[#c31432] flex items-center justify-between h-20">
                    <h1 className={"text-white"}>Credits?</h1>
                </footer>
            </div>

        );
    }
    
    export default App;