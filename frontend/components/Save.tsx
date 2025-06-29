import { useState } from "react";
//import * as pako from "pako";
import {useAuth0} from "@auth0/auth0-react";

interface SaveProps {
    file: File;
    responseText: string;
}

const Save: React.FC<SaveProps> = ({ file, responseText }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const {user} = useAuth0();
    const uID = user?.sub?.slice(-8).toUpperCase() || "No associated user";

    /*
    const compressAndEncode = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const compressed = pako.deflate(new Uint8Array(arrayBuffer));
        const base64 = btoa(
            compressed.reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        return base64;
    };
     */

    const compressImageFile = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                if (!e.target?.result) return;
                img.src = e.target.result as string;
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

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const encodedImage = await compressImageFile(file);
            const formData = new FormData();
            formData.append("file", encodedImage);
            formData.append("userID", uID);
            formData.append("textFile", JSON.stringify({ text: responseText }));

            const res = await fetch("http://localhost:3001/api/insertUpload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            setSuccess(true);
        } catch (err: any) {
            console.error("Error saving to DB:", err);
            setError("Failed to save data.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <div onClick={() => {
                if (!isSaving) handleSave();
            }} className="cursor-pointer">
                {isSaving ? "Saving..." : "Save to Database"}
            </div>
            {success &&
                <p className="text-green-600">
                    Saved successfully!
                </p>
            }
            {error &&
                <p className="text-red-600">
                    {error}
                </p>
            }
        </div>
    );
};

export default Save;