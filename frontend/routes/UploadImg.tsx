import { useState} from "react";
type ShapeType = "Entity" | "Attribute" | "Relationship" | "Unknown";
import Header from "../components/Header.tsx";
import Footer from "../components/Footer.tsx";
import ProcessXML from "../components/ProcessXML.tsx";
import {useNavigate} from "react-router-dom";
import {AppSidebar} from "../components/AppSidebar.tsx";

    interface Shape {
        id: string;
        label: string;
        type: ShapeType;
        isKey?: boolean;
        isWeak?: boolean;
    }

    function sanitizeName(name: string): string {
        return name
            .trim()
            .replace(/\s+/g, '_')        // Replace spaces with underscores
            .replace(/[^a-zA-Z0-9_]/g, '') // Remove all non-alphanum/underscore
            .replace(/^(\d)/, '_$1');    // Prefix leading digits with underscore
    }

    const UploadImg = () => {
        const navigate = useNavigate();
        const [entities, setEntities] = useState<Record<string, Shape>>({});
        const [attributesByEntity, setAttributesByEntity] = useState<Record<string, {label: string, isKey: boolean}[]>>({});
        const [relationships, setRelationships] = useState<
            { name: string; entities: string[]; isWeak?: boolean }[]
        >([]);
        const [debugInfo, setDebugInfo] = useState<string>("");
        const [parsedXML, setParsedXML] = useState<Document | null>(null);
        const [isLoading, setIsLoading] = useState(false);
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

        return (
            <div>
                <Header />
                {/*<AppSidebar />*/}
                <ProcessXML
                    entities={entities}
                    setEntities={setEntities}
                    attributesByEntity={attributesByEntity}
                    setAttributesByEntity={setAttributesByEntity}
                    relationships={relationships}
                    setRelationships={setRelationships}
                    debugInfo={debugInfo}
                    setDebugInfo={setDebugInfo}
                    parsedXML={parsedXML}
                    setParsedXML={setParsedXML}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                />

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
                        </div>
                    </div>
                </div>
                <Footer />
            </div>

        );
    }
    
    export default UploadImg;