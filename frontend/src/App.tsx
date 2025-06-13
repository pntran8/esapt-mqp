    import React, { useState } from "react";

    type ShapeType = "Entity" | "Attribute" | "Relationship" | "Unknown";
    
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
    }
    function sanitizeName(name: string): string {
        return name
            .trim()
            .replace(/\s+/g, '_')        // Replace spaces with underscores
            .replace(/[^a-zA-Z0-9_]/g, '') // Remove all non-alphanum/underscore
            .replace(/^(\d)/, '_$1');    // Prefix leading digits with underscore
    }


    function App() {
        const [entities, setEntities] = useState<Record<string, Shape>>({});
        const [attributesByEntity, setAttributesByEntity] = useState<Record<string, {label: string, isKey: boolean}[]>>({});
        const [relationships, setRelationships] = useState<
            { name: string; entities: string[]; isWeak?: boolean }[]
        >([]);
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

                        const isWeak =
                            !isEdge && (
                                style.includes("strokeWidth=2") ||
                                style.includes("dashed=1") ||
                                value.toLowerCase().includes("weak")
                            );

                        // Only log edges or cells that have a visible label
                        if (isEdge || value.trim()) {
                            console.log(`[${i}] ID: ${id}`);
                            console.log(`   Value: ${value}`);
                            console.log(`   Style: ${style}`);
                            console.log(`   IsEdge: ${isEdge}`);
                            console.log(`   isWeak: ${isWeak}`);
                            if (isEdge) {
                                console.log(`   Source: ${source}, Target: ${target}`);
                            }
                        }
                    });



                    const shapeMap: Record<string, Shape> = {};
                    const edges: Connection[] = [];
    
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
    
                    // get lines (the edges)
                    for (const cell of cells) {
                        if (cell.getAttribute("edge") === "1") {
                            const source = cell.getAttribute("source");
                            const target = cell.getAttribute("target");
                            if (source && target) {
                                edges.push({ from: source, to: target });
                            }
                        }
                    }
    
                    setDebugInfo(`Found ${Object.keys(shapeMap).length} shapes and ${edges.length} edges`);
    
                    // stores attribute with key
                    const entityAttributeDetails: Record<string, {label: string, isKey: boolean}[]> = {};
                    const relationshipLinks: Record<string, string[]> = {};

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
                        if (from.type === "Entity" && to.type === "Relationship") {
                            if (!relationshipLinks[to.label]) relationshipLinks[to.label] = [];
                            relationshipLinks[to.label].push(from.label);
                        } else if (to.type === "Entity" && from.type === "Relationship") {
                            if (!relationshipLinks[from.label]) relationshipLinks[from.label] = [];
                            relationshipLinks[from.label].push(to.label);
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

                    console.log("Relationships:", relationshipLinks);


                    const relationshipArray = Object.entries(relationshipLinks).map(([name, ents]) => {
                        const shape = Object.values(shapeMap).find((s) => s.label === name && s.type === "Relationship");
                        return { name, entities: ents, isWeak: shape?.isWeak };
                    });

                    setRelationships(relationshipArray);


                    setDebugInfo(`Processed: ${Object.keys(entityAttributeDetails).length} entities with attributes, ${relationshipArray.length} relationships`);
                    setIsLoading(false);
                };
    
                reader.readAsText(file);
            } catch (error) {
                setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setIsLoading(false);
            }
        };
        const generateSQLSchema = () => {
            let sql = "";

            const definedTables = new Set<string>();

            // 1. Define all tables for entities
            for (const [entityName, attributes] of Object.entries(attributesByEntity)) {
                const tableName = sanitizeName(entityName);
                definedTables.add(tableName);

                sql += `CREATE TABLE ${tableName} (\n`;

                const lines: string[] = [];
                for (const attr of attributes) {
                    const fieldName = sanitizeName(attr.label);
                    const fieldType = attr.isKey ? "INT" : "VARCHAR(255)";
                    let line = `  ${fieldName} ${fieldType}`;
                    if (attr.isKey) line += " PRIMARY KEY";
                    lines.push(line);
                }

                sql += lines.join(",\n") + `\n);\n\n`;
            }

            // 2. Relationships
            const addedConstraints = new Set<string>();

            for (const rel of relationships) {
                if (rel.entities.length === 2) {
                    const [a, b] = rel.entities;
                    const tableA = sanitizeName(a);
                    const tableB = sanitizeName(b);
                    /*const relName = sanitizeName(rel.name);*/

                    const constraintId = [tableA, tableB].sort().join("_");

                    if (!addedConstraints.has(constraintId)) {
                        sql += `-- Relationship: ${a} <--> ${b} via ${rel.name}\n`;

                        sql += `ALTER TABLE ${tableA}\n  ADD COLUMN ${tableB.toLowerCase()}_id INT,\n  ADD FOREIGN KEY (${tableB.toLowerCase()}_id) REFERENCES ${tableB}(id);\n\n`;

                        sql += `ALTER TABLE ${tableB}\n  ADD COLUMN ${tableA.toLowerCase()}_id INT,\n  ADD FOREIGN KEY (${tableA.toLowerCase()}_id) REFERENCES ${tableA}(id);\n\n`;

                        addedConstraints.add(constraintId);
                    }
                } else {
                    // Relationship with >2 entities → join table
                    const joinTable = sanitizeName(rel.name);
                    if (!definedTables.has(joinTable)) {
                        sql += `-- Join table for relationship: ${rel.name}\n`;
                        sql += `CREATE TABLE ${joinTable} (\n`;

                        const lines: string[] = [];

                        rel.entities.forEach((ent) => {
                            const colName = sanitizeName(ent.toLowerCase() + "_id");
                            const refTable = sanitizeName(ent);
                            lines.push(`  ${colName} INT,\n  FOREIGN KEY (${colName}) REFERENCES ${refTable}(id)`);
                        });

                        sql += lines.join(",\n") + `\n);\n\n`;

                        definedTables.add(joinTable);
                    }
                }
            }

            return sql;
        };


        const generatePrismaSchema = () => {
            let schema = `generator client {
              provider = "prisma-client-js"
            }
            
            datasource db {
              provider = "postgresql"
              url      = env("DATABASE_URL")
            }\n\n`;

            const definedModels = new Set<string>();

            // Generate base models with attributes
            for (const [entityName, attributes] of Object.entries(attributesByEntity)) {
                definedModels.add(entityName);

                schema += `model ${sanitizeName(entityName)} {\n`;

                for (const attr of attributes) {
                    const fieldName = sanitizeName(attr.label);
                    const isId = attr.isKey;
                    const fieldType = isId ? "Int" : "String";

                    schema += `  ${fieldName} ${fieldType}${isId ? " @id @default(autoincrement())" : ""}\n`;
                }

                schema += `}\n\n`;
            }

            // Add relationships to models
            const addedRelations = new Set<string>();

            for (const rel of relationships) {
                if (rel.entities.length === 2) {
                    const [entityA, entityB] = rel.entities;
                    const modelA = sanitizeName(entityA);
                    const modelB = sanitizeName(entityB);
                    const relName = sanitizeName(rel.name);

                    // Add relation fields if models exist
                    if (definedModels.has(entityA) && definedModels.has(entityB)) {
                        // Ensure relation is only added once per pair
                        const relId = [modelA, modelB].sort().join("-");
                        if (!addedRelations.has(relId)) {
                            schema = schema.replace(
                                new RegExp(`model ${modelA} {([\\s\\S]*?)\\n\\}`),
                                `model ${modelA} {\$1\n  ${modelB.toLowerCase()}s ${modelB}[] @relation("${relName}")\n}`
                            );

                            schema = schema.replace(
                                new RegExp(`model ${modelB} {([\\s\\S]*?)\\n\\}`),
                                `model ${modelB} {\$1\n  ${modelA.toLowerCase()}s ${modelA}[] @relation("${relName}")\n}`
                            );

                            addedRelations.add(relId);
                        }
                    }
                } else {
                    // If the relationship involves > 2 entities, generate a join table
                    const relModelName = sanitizeName(rel.name);
                    if (!definedModels.has(relModelName)) {
                        schema += `model ${relModelName} {\n`;
                        rel.entities.forEach((ent, idx) => {
                            const model = sanitizeName(ent);
                            const field = `${model.toLowerCase()}${idx}`;
                            schema += `  ${field} ${model} @relation(fields: [${field}Id], references: [id])\n`;
                            schema += `  ${field}Id Int\n`;
                        });
                        schema += `  id Int @id @default(autoincrement())\n`;
                        schema += `}\n\n`;
                        definedModels.add(relModelName);
                    }
                }
            }

            return schema;
        };


        const entityCount = Object.keys(attributesByEntity).length;
        const entitiesWithNoAttributes = Object.values(entities).filter(
            (shape) => shape.type === "Entity" && !attributesByEntity[shape.label]
        );

        const relationshipCount = relationships.length;
        const totalShapes = Object.keys(entities).length;


        return (
            <div className="max-w-4xl mx-auto p-6 bg-white">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">???</h1>
    
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        ONLY A .DRAWIO FILE (it should be XML if you export it, BUT CAN'T BE COMPRESSED)
                    </label>
                    <input
                        type="file"
                        accept=".drawio,.xml"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {isLoading && <p className="mt-2 text-blue-600">loading...</p>}
                </div>
    
                {debugInfo && (
                    <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-2">hello???</h3>
                        <p className="text-sm text-gray-600">{debugInfo}</p>
                    </div>
                )}
    
                {totalShapes > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold text-blue-800 mb-2">summary</h3>
                        <p className="text-sm text-blue-700">
                            {totalShapes} total shapes, {entityCount} entities, {relationshipCount} relationships
                        </p>
                    </div>
                )}
                {entitiesWithNoAttributes.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Entities Without Attributes</h2>
                        <ul className="list-disc list-inside text-gray-700">
                            {entitiesWithNoAttributes.map((entity) => (
                                <li key={entity.id}>{entity.label}</li>
                            ))}
                        </ul>
                    </div>
                )}


                {entityCount > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">ENTITIES AND ATTRIBUTES</h2>
                        <div className="space-y-3">
                            {Object.entries(attributesByEntity).map(([entity, attrs]) => {
                                const keys = attrs.filter(attr => attr.isKey);
                                const regularAttrs = attrs.filter(attr => !attr.isKey);
    
                                return (
                                    <div key={entity} className="p-4 border border-gray-200 rounded-lg">
                                        <h3 className="font-bold text-lg text-blue-600 mb-3">{entity}</h3>
    
                                        {keys.length > 0 && (
                                            <div className="mb-2">
                                                <span className="font-semibold text-yellow-800">Key: </span>
                                                <span className="text-gray-700">
                                                    {keys.map(key => key.label).join(', ')}
                                                </span>
                                            </div>
                                        )}
    
                                        {regularAttrs.length > 0 && (
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-800">Attributes: </span>
                                                <span className="text-gray-700">
                                                    {regularAttrs.map(attr => attr.label).join(', ')}
                                                </span>
                                            </div>
                                        )}
    
                                        {attrs.length === 0 && (
                                            <p className="text-gray-500 text-sm">No attributes found</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {relationshipCount > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Relationships</h2>
                        <div className="space-y-3">
                            {relationships.map((rel, i) => (
                                <div key={i} className="p-4 border border-gray-200 rounded-lg">
                                    <h3 className="font-bold text-lg text-green-600 mb-2">
                                        {rel.name} {rel.isWeak && <span className="text-red-500 text-sm">(weak)</span>}
                                    </h3>
                                    <p className="text-gray-700">
                                        {rel.entities.join(" <--> ")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
    
                {totalShapes === 0 && !isLoading && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">ONLY A .DRAWIO FILE</p>
                    </div>
                )}
    
                {totalShapes > 0 && entityCount === 0 && relationshipCount === 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h3 className="font-semibold text-yellow-800 mb-2">no elements found</h3>
                        <p className="text-yellow-700 text-sm">
                            {totalShapes} shapes, but no entities or relationships were detected. MAKE SURE IT'S ALL PROPERLY CONNECTED
                        </p>
                    </div>
                )}
                {entityCount > 0 && (
                    <div className="my-8">
                        <h2 className="text-xl font-bold mb-2 text-gray-800">SQL Schema Output</h2>
                        <button
                            className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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

                {entityCount > 0 && (
                    <div className="my-8">
                        <h2 className="text-xl font-bold mb-2 text-gray-800">Prisma Schema Output</h2>
                        <button
                            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            onClick={() => {
                                const schema = generatePrismaSchema();
                                const blob = new Blob([schema], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = "schema.prisma";
                                link.click();
                                URL.revokeObjectURL(url);
                            }}
                        >
                            Download Prisma Schema
                        </button>
                    </div>
                )}
            </div>

        );
    }
    
    export default App;