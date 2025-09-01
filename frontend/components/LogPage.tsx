import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Header from "./Header.tsx";

interface LogEntry {
    id: number;
    userID: string;
    textFile: string;
    decodedImage: string;
    timeCreated: string;
}

const LogPage: React.FC = () => {
    const { userID } = useParams();
    const [searchParams] = useSearchParams();
    const [entry, setEntry] = useState<LogEntry | null>(null);

    const id = searchParams.get("id");
    const timeCreated = searchParams.get("timeCreated");

    function parseAndRenderContent(input: string) {
        try {
            const parsed = JSON.parse(input);
            const content = typeof parsed === "object" && parsed.text ? parsed.text : input;
            return renderParsedContent(content);
        } catch {
            return renderParsedContent(input);
        }
    }

    function renderParsedContent(content: string) {
        const lines = content.split('\n');
        const elements: JSX.Element[] = [];
        let currentSection: string[] = [];
        let inCodeBlock = false;
        let codeBlock: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // if line starts with ===
            if (line.startsWith('===')) {
                if (inCodeBlock && codeBlock.length > 0) {
                    elements.push(
                        <pre key={`code-${i}`} className="bg-[#E7E7E7] rounded-sm p-4 mb-4">
                            <code>{codeBlock.join('\n')}</code>
                        </pre>
                    );
                    codeBlock = [];
                    inCodeBlock = false;
                }

                if (currentSection.length > 0) {
                    elements.push(
                        <div key={`section-${i}`} className="mb-4 whitespace-pre-wrap">
                            {currentSection.join('\n')}
                        </div>
                    );
                    currentSection = [];
                }

                elements.push(
                    <h3 key={`header-${i}`} className="font-bold text-lg mb-2 text-[#981026]">
                        {line}
                    </h3>
                );
            }
            // if line starts with CREATE TABLE
            else if (line.trim().startsWith('CREATE TABLE')) {
                if (currentSection.length > 0) {
                    elements.push(
                        <div key={`section-before-code-${i}`} className="mb-4 whitespace-pre-wrap">
                            {currentSection.join('\n')}
                        </div>
                    );
                    currentSection = [];
                }

                inCodeBlock = true;
                codeBlock.push(line);
            }
            else if (inCodeBlock) {
                // if this line is part of the SQL (contains SQL keywords or is indented/part of table definition)
                if (line.trim() === '' ||
                    line.includes('(') ||
                    line.includes(')') ||
                    line.includes('PRIMARY KEY') ||
                    line.includes('VARCHAR') ||
                    line.includes('INT') ||
                    line.includes('NUMERIC') ||
                    line.includes(',') ||
                    line.trim().endsWith(';') ||
                    (line.startsWith(' ') && codeBlock.length > 0)) {
                    codeBlock.push(line);
                } else {
                    elements.push(
                        <pre key={`code-${i}`} className="bg-[#E7E7E7] rounded-sm p-4 mb-4">
                            <code>{codeBlock.join('\n')}</code>
                        </pre>
                    );
                    codeBlock = [];
                    inCodeBlock = false;

                    if (line.trim() !== '') {
                        currentSection.push(line);
                    }
                }
            }
            else {
                currentSection.push(line);
            }
        }

        if (inCodeBlock && codeBlock.length > 0) {
            elements.push(
                <pre key="final-code" className="bg-[#E7E7E7] rounded-sm p-4 mb-4">
                    <code>{codeBlock.join('\n')}</code>
                </pre>
            );
        }

        if (currentSection.length > 0) {
            elements.push(
                <div key="final-section" className="mb-4 whitespace-pre-wrap">
                    {currentSection.join('\n')}
                </div>
            );
        }

        return <div>{elements}</div>;
    }

    useEffect(() => {
        if (!userID || !id || !timeCreated) {
            console.log("uh oh");
            //console.log(userID);
            //console.log(id);
            //console.log(timeCreated);
            return;
        };

        const fetchUploads = async () => {
            try {
                const res = await fetch(
                    `/api/viewUpload?userID=${userID}&id=${id}&timeCreated=${encodeURIComponent(timeCreated)}`
                );

                console.log("after trying to fetch image");
                console.log("Response status:", res.status);
                console.log("Response headers:", res.headers);

                const data = await res.json();
                if (data.length > 0) {
                    const d = data[0];
                    setEntry({
                        id: d.id,
                        userID: d.userID,
                        textFile: d.textFile,
                        decodedImage: d.decodedImage,
                        timeCreated: d.timeCreated,
                    });
                }
            } catch (err) {
                console.error("Failed to fetch uploads 2:", err);
            }
        };

        fetchUploads();
    }, [userID, id, timeCreated]);

    if (!entry) {
        return (
            <div>
                Loading...
            </div>
        );
    };

    return (
        <>
            <Header />
            <header className="text-center text-4xl mt-8 font-bold">Log for User {userID}</header>

            <div className="w-full flex justify-center mb-4 mt-4">
                <img
                    src={entry.decodedImage}
                    alt="Upload preview"
                    className="max-w-full max-h-99vh object-contain rounded mb-1"
                />
            </div>

            <div className="text-md overflow-auto break-words p-5">
                <div className="text-left">
                    {parseAndRenderContent(entry.textFile)}
                </div>

                <p className="text-[10px] text-gray-500 mt-4">
                    {new Date(entry.timeCreated).toLocaleString()}
                </p>
            </div>
        </>
    );
};

export default LogPage;