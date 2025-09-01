import {SetStateAction, useEffect, useState} from "react";
import Papa from "papaparse";
import Header from "./Header";
import Footer from "./Footer";

const Normalization = () => {
    const [data, setData] = useState<any[]>([]);
    // const [powerSet, setPowerSet] = useState<any[]>([]);
    let attributeNames = new Set<string>();

    // tuples
    const sanitizeColumns = (data: any) => {

        return data.map((item: any) => {
            const sanitizedItem: any = {};
            Object.keys(item).forEach((key) => {
                const sanitizedKey = key.toLowerCase().replace(/(\s|-)+/g, "_");
                attributeNames.add(sanitizedKey);
                sanitizedItem[sanitizedKey] = item[key];
            });
            return sanitizedItem;
        });
    };

    function getPowerSet (set: Set<string>) {
        if (set.size === 0) {
            return [[]];
        }

        const arr = Array.from(set);

        const subsets: SetStateAction<any[]> = [];

        const firstElement = arr[0];
        const remainingArray = arr.slice(1);
        const remainingSet: Set<string> = new Set(remainingArray);


        getPowerSet(remainingSet).forEach((item: string) => {
            subsets.push(item);
            subsets.push([firstElement, ...item]);
        })

        console.log("length", subsets.length);
        return subsets;

    }


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
            console.log("sanitized data, ", sanitizedData);
            const powerSet = getPowerSet(attributeNames);
            const arrAttributeNames = Array.from(attributeNames);
            console.log("power set", powerSet);



            // partitions by levels
            let levels: Record<string, any[]> = {};  // should be like {1:{{a},{b}}, 2:{{a,b}}
            for (let j = 0; j < attributeNames.size; j++) { // a, b, ...
                const level: any[] = [];
                for (let i = 0; i < powerSet.length; i++) {
                    if (powerSet[i].length === j) {
                        level.push(powerSet[i]);
                    }
                }
                levels[j] = level;
            }

            console.log("levels ", levels);


            console.log("array power set: ", arrAttributeNames);

            const allPartitions : Record<string, any[]> = {};
            function partitionsAllLevels  (rows : any[], powerSet : any[]){

                for (let i = 0; i < powerSet.length; i++) {// iterate through subsets (ie a,b, a, whatever)
                    const partition : Record<string, any[]> = {};
                    const currentSubset = powerSet[i]; // current subset
                    for (let j = 0; j < rows.length; j++){ // for row in rows
                        let row = rows[j]; // single tuple
                        const key = currentSubset.map(attr => row[attr]).join(',');

                        if (partition.hasOwnProperty(key)) { // this combination alr exists
                            partition[key].push(j); // add to combination
                        }
                        else{
                            partition[key] = [j]; // combination doesn't exist, just append to whole thing
                        }

                    }
                    allPartitions[currentSubset.toString()] = [partition];
                }

            }

            partitionsAllLevels(sanitizedData, powerSet);
            console.log("allPartitions ", allPartitions);




            // const level1Partitions : Record<string, any[]> = {};
            // for (let j = 0; j < arrAttributeNames.length; j++){
            //     const room: Record<string, any[]> = {};
            //     for (let i = 0; i < sanitizedData.length; i++) {
            //         const key = sanitizedData[i][arrAttributeNames[j]];
            //         if (room.hasOwnProperty(key)) { // this combination alr exists
            //             room[key].push(i); // add to combination
            //         }
            //         else{
            //             room[key] = [i]; // combination doesn't exist, just append to whole thing
            //         }
            //     }
            //     level1Partitions[arrAttributeNames[j]] = [room];
            // }
            //
            // console.log("level1Partitions ", level1Partitions);
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
