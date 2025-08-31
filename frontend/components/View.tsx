import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Header from "./Header.tsx";
import { useNavigate } from "react-router-dom";

interface UploadEntry {
    id: number;
    userID: string;
    textFile: string;
    decodedImage: string;
    timeCreated: string;
}

const View: React.FC = () => {
    const { user, isAuthenticated } = useAuth0();
    const [entries, setEntries] = useState<UploadEntry[]>([]);
    const [openEntryId, setOpenEntryId] = useState(0);
    const openEntry = entries.find((e) => e.id === openEntryId) || null;
    const navigate = useNavigate();

    function parseText(input: string) {
        try {
            const parsed = JSON.parse(input);
            return typeof parsed === "object" && parsed.text ? parsed.text : input;
        } catch {
            return input;
        }
    }

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
                        <pre key={`code-${i}`} className="bg-[#E7E7E7] rounded-sm p-4 mb-4 whitespace-pre-wrap break-words">
                            <code>{codeBlock.join('\n')}</code>
                        </pre>
                    );
                    codeBlock = [];
                    inCodeBlock = false;
                }

                if (currentSection.length > 0) {
                    elements.push(
                        <div key={`section-${i}`} className="mb-4 whitespace-pre-wrap ">
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
        if (!isAuthenticated || !user?.sub) return;

        const fetchUploads = async () => {
            try {
                const res = await fetch(
                    `http://localhost:3001/api/viewUpload?userID=${user?.sub?.slice(-8).toUpperCase()}`
                );
                const data = await res.json();
                console.log(data);
                setEntries(data);
            } catch (err) {
                console.error("Failed to fetch uploads:", err);
            }
        };

        fetchUploads();
    }, [isAuthenticated, user]);

    return (
        <>
            <Header />
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {entries.map((entry) => (
                    <div
                        key={entry.id}
                        onClick={() => setOpenEntryId(entry.id)}
                        className="cursor-pointer border shadow rounded-xl p-2 flex flex-col items-center w-auto h-95 overflow-hidden"
                    >
                        <img
                            src={entry.decodedImage}
                            alt="Upload preview"
                            className="w-full h-32 object-cover rounded mb-1"
                        />
                        <div className="text-xs overflow-auto whitespace-pre-wrap break-words">
                            {parseText(entry.textFile)}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                            {new Date(entry.timeCreated).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>

            {/* popup */}
            {openEntry && (
                <div
                    onClick={() => setOpenEntryId(0)}
                    className="fixed inset-0 bg-gray-400/50 flex justify-center items-center z-50 p-4"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-full overflow-auto p-6 flex flex-col items-center"
                    >
                        <div className="w-full flex justify-between items-center mb-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() =>
                                        navigate(`/viewHistory/${user?.sub?.slice(-8).toUpperCase()}?id=${openEntry.id}&timeCreated=${encodeURIComponent(openEntry.timeCreated)}`)
                                    }
                                    className="bg-[#981026] text-white p-2 hover:bg-[#c31431] rounded-2xl cursor-pointer"
                                >
                                    Share Log
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            await fetch(`http://localhost:3001/api/removeUpload?id=${openEntry.id}`, {
                                                method: "DELETE",
                                            });
                                            setEntries(entries.filter((e) => e.id !== openEntry.id));
                                            setOpenEntryId(0); // close modal
                                        } catch (err) {
                                            console.error("Failed to delete entry:", err);
                                        }
                                    }}
                                    className="bg-[#981026] text-white p-2 hover:bg-[#c31431] px-3 py-2 rounded-2xl cursor-pointer"
                                >
                                    Delete
                                </button>
                            </div>
                            <button
                                onClick={() => setOpenEntryId(0)}
                                className="cursor-pointer text-lg text-gray-600 hover:text-gray-900"
                            >
                                ✕
                            </button>
                        </div>
                        <img
                            src={openEntry.decodedImage}
                            alt="Upload preview large"
                            className="w-full max-h-96 object-contain rounded mb-4"
                        />
                        <div className="w-full text-left">
                            {parseAndRenderContent(openEntry.textFile)}
                        </div>
                        <p className="text-sm text-gray-500 mt-4">
                            {new Date(openEntry.timeCreated).toLocaleString()}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default View;