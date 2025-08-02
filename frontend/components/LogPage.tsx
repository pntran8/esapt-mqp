import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Header from "./Header.tsx";
import ReactMarkdown from "react-markdown";

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
                    `/api/viewUpload/getLog?userID=${userID}&id=${id}&timeCreated=${encodeURIComponent(timeCreated)}`
                );

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
                console.error("Failed to fetch uploads:", err);
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

    function parseText(input: string): string {
        try {
            const parsed = JSON.parse(input);
            return typeof parsed === "object" && parsed.text
                ? parsed.text
                : input;
        } catch {
            return input;
        }
    }

    return (
        <>
            <Header />
            <img
                src={entry.decodedImage}
                alt="Upload preview"
                className="w-full h-full object-cover rounded mb-1"
            />
            <div className="text-md overflow-auto whitespace-pre-wrap break-words p-5">
                <ReactMarkdown>
                    {parseText(entry.textFile)}
                </ReactMarkdown>

                <p className="text-[10px] text-gray-500 mt-1">
                    {new Date(entry.timeCreated).toLocaleString()}
                </p>
            </div>
        </>
    );
};

export default LogPage;