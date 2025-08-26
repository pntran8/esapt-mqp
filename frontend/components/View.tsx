import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Header from "./Header.tsx";
import ReactMarkdown from "react-markdown";
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


    function parseText(input: string){
        try {
            console.log("INPUT", input);
            const parsed = JSON.parse(input);
            const cleanedText = parsed.text.replace(/`/g, "").replace("sql","" ).replace(/\*\*(.*?)\*\*/g, "$1");
            const code = cleanedText.split("-------")

            console.log("type?? ", typeof cleanedText);
            console.log("code ", typeof code[0]);

            return typeof parsed === "object" && parsed.text
                ? cleanedText
                : input;
        } catch {
            return input;
        }
    }

    function parseCode(input: string){
        try {
            console.log("INPUT", input);
            const parsed = JSON.parse(input);
            const cleanedText = parsed.text.replace(/`/g, "").replace("sql","" ).replace(/\*\*(.*?)\*\*/g, "$1");
            const code = cleanedText.split("-------")

            console.log("type?? ", typeof cleanedText);
            console.log("code ", typeof code[0]);

            return typeof parsed === "object" && parsed.text
                ? code[0]
                : input;
        } catch {
            return input;
        }
    }

    function parseExplanation(input: string){
        try {
            console.log("INPUT", input);
            const parsed = JSON.parse(input);
            const cleanedText = parsed.text.replace(/`/g, "").replace("sql","" ).replace(/\*\*(.*?)\*\*/g, "$1");
            const code = cleanedText.split("-------")

            console.log("type?? ", typeof cleanedText);
            console.log("code ", typeof code[0]);

            return typeof parsed === "object" && parsed.text
                ? code[1]
                : input;
        } catch {
            return input;
        }
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
                        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-full overflow-auto p-6 flex flex-col items-center"
                    >
                        <div className="w-full flex justify-between items-center mb-4">
                            <button
                                onClick={() =>
                                    navigate(`/viewHistory/${user?.sub?.slice(-8).toUpperCase()}?id=${openEntry.id}&timeCreated=${encodeURIComponent(openEntry.timeCreated)}`)
                                }
                                className="bg-[#981026] text-white p-2 hover:bg-[#c31431] rounded-2xl cursor-pointer"
                            >
                                Share Log
                            </button>
                            <button
                                onClick={() => setOpenEntryId(0)}
                                className="cursor-pointer text-lg text-gray-600 hover:text-gray-900"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="w-full flex items-center justify-between mb-4">
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
                            className="bg-red-600 text-white px-3 py-2 hover:bg-red-800 rounded-2xl cursor-pointer"
                        >
                            Delete
                        </button>
                        </div>
                        <img
                            src={openEntry.decodedImage}
                            alt="Upload preview large"
                            className="w-full max-h-96 object-contain rounded mb-4"
                        />
                        <div className="whitespace-pre-wrap break-words mb-4">
                            Schema:
                            <p style={{ textAlign: 'left' }}>
                                <pre className={"bg-[#E7E7E7] rounded-sm p-4"}>
                                    <code>
                                        {parseCode(openEntry.textFile)}
                                    </code>
                                </pre>
                                {parseExplanation(openEntry.textFile)}
                            </p>
                        </div>
                        <p className="text-sm text-gray-500">
                            {new Date(openEntry.timeCreated).toLocaleString()}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default View;