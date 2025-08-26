import { useState } from "react";
import Papa from "papaparse";
import Header from "./Header";
import Footer from "./Footer";

const Normalization = () => {
    const sanitizeColumns = (data: any) => {
        return data.map((item: any) => {
            const sanitizedItem: any = {};
            Object.keys(item).forEach((key) => {
                const sanitizedKey = key.toLowerCase().replace(/(\s|-)+/g, "_");
                sanitizedItem[sanitizedKey] = item[key];
            });
            return sanitizedItem;
        });
    };

    const [data, setData] = useState<any[]>([]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = ({ target }) => {
            if (!target?.result) return;

            const { data } = Papa.parse(target.result as string, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
            });

            const sanitizedData = sanitizeColumns(data);
            setData(sanitizedData);
        };

        reader.readAsText(file);
    };

    return (
        <>
            <Header />
            <header className="text-center text-4xl mt-8 font-bold">
                Normalization
            </header>

            {/* File input */}
            <div className="flex justify-center mt-6">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="chat-input border rounded p-2"
                    style={{ fontSize: "2vh" }}
                />
            </div>

            {/* show parsed CSV */}
            <div className="p-4">
                {data.length > 0 ? (
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                ) : (
                    <p className="text-center mt-4">Upload a CSV to see results</p>
                )}
            </div>

            <Footer />
        </>
    );
};

export default Normalization;
