import {SetStateAction, useState} from "react";
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

            const partitionsByLevel : Record <string, any[]> = {};
            // const allPartitions : Record<string, any[]> = {};
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

                    if (!partitionsByLevel[powerSet[i].length]) {
                        partitionsByLevel[powerSet[i].length] = []; // if it bugs out try {} instead of []
                    }

                    partitionsByLevel[powerSet[i].length][currentSubset.toString()] = [partition];
                }

            }

            partitionsAllLevels(sanitizedData, powerSet);
            // console.log("allPartitions ", allPartitions);
            console.log("partitions by level, ", partitionsByLevel)
            console.log("length, ", Object.keys(partitionsByLevel).length)

            type FD = {
                lhs: string[];
                rhs: string[];
            };

            const fds: FD[] = [];

            function comparePartitions (partitionsByLevel : Record<string, any[]>){
                for (let levelNum = 1; levelNum < Object.keys(partitionsByLevel).length; levelNum++){ // level
                    const level = partitionsByLevel[levelNum];
                    console.log(`LEVEL ${levelNum}`, level);
                    // [a: Array(1), b: Array(1), c: Array(1), d: Array(1)]

                    for (let j = 0; j < Object.values(level).length; j++) {
                        // console.log("equivalent ", Object.values(level)[j]);
                        const arr = Object.values(level)[j];
                        const partition1 = Object.values(arr[0]);
                        const key1 = Object.keys(level)[j];
                        // console.log("j arr", partition1);
                        // console.log("key?", Object.keys(level)[j]);
                        for (let k = 0; k < Object.values(partitionsByLevel[1]).length; k++) {
                            const arr2 = Object.values(partitionsByLevel[1])[k];
                            const partition2 = Object.values(arr2[0]);
                            const key2 = Object.keys(partitionsByLevel[1])[k];
                            console.log(`Testing ${key1} -> ${key2}`);

                            // key2.includes(key1)
                            if (key1.includes(key2)){
                                // want it to ignore it, since its trivial
                                console.log(`Trivial`);
                            }
                            // else if (partition1.length !== partition2.length){
                            //     // ignore it, since if length not the same they clearly not equal
                            //     console.log(`NOPE! ${key1} ! -> ${key2}`);
                            // }
                            else {
                                // length is equal.
                                // const combinedArray = partition1.concat(partition2);
                                function normalize(rows: any[][]): Set<string> {
                                    return new Set(rows.map(r => JSON.stringify(r)));
                                }

                                const set1 = normalize(partition1);
                                const set2 = normalize(partition2);

                                // equal if they have the same size and every row from set1 is in set2
                                const equal = partition1.every(block1 =>
                                    partition2.some(block2 =>
                                        block1.every(idx => block2.includes(idx))
                                    )
                                );

                                if (equal) {
                                    console.log("Partitions are equivalent!");
                                    fds.push({ lhs: key1.split(","), rhs: key2.split(",") });
                                    if (set1.size === sanitizedData.length) {
                                        console.log("this is also a superkey i think idk im a little lost");
                                        for (let i = levelNum; i < Object.keys(partitionsByLevel).length; i++) {
                                            const currentLevel = partitionsByLevel[i];
                                            console.log("Current level:", currentLevel);

                                            // Make a copy of keys so deleting doesn’t mess up the loop
                                            const keys = Object.keys(currentLevel);
                                            for (const key of keys) {
                                                // console.log("Checking key:", key);
                                                // console.log("key1:", key1);

                                                if (key.includes(key1) && currentLevel !== level) {
                                                    console.log(`Deleting key "${key}" from currentLevel`);
                                                    delete currentLevel[key];
                                                    console.log("is it acc deleting??", partitionsByLevel);
                                                }
                                            }
                                        }
                                        // for (let i = levelNum; i < Object.keys(partitionsByLevel).length; i++) { // level
                                        //     const currentLevel = partitionsByLevel[i];
                                        //     console.log("fuck you ", currentLevel)
                                        //     for (let j = 0; j < Object.values(currentLevel).length; j++) {
                                        //         const key = Object.keys(currentLevel)[j];
                                        //         console.log("key", key);
                                        //         console.log("key1", key1);
                                        //         console.log("incluedes?", key.includes(key1))
                                        //         console.log("current", currentLevel);
                                        //         console.log("level", level)
                                        //         console.log("yeah this is ok", currentLevel[key]);
                                        //         if (key.includes(key1) && currentLevel !== level){
                                        //             console.log("is it filtering here");
                                        //             // go thru all powersets in each partitions by level, if key1 is a substring of key, remove that powerset
                                        //             delete currentLevel[key];
                                        //             // delete partitionsByLevel.i[key];
                                        //         }
                                        //     }
                                        //     // for (const key in currentLevel){
                                        //     //     console.log("key", key);
                                        //     //     console.log("key1", key1);
                                        //     //     console.log("incluedes?", key.includes(key1))
                                        //     //     console.log("current", currentLevel);
                                        //     //     console.log("level", level)
                                        //     //     if (key.includes(key1) && currentLevel !== level){
                                        //     //         console.log("is it filtering here");
                                        //     //         // go thru all powersets in each partitions by level, if key1 is a substring of key, remove that powerset
                                        //     //         delete key;
                                        //     //     }
                                        //     // }
                                        // }

                                    }
                                }
                                else{
                                    console.log("Partitions are not equivalent!");
                                }


                            }

                        }

                    }



                    // no clue wtf this is for
                    // for (const arr of Object.values(level)) { // just partition a or b or c or etc
                    //     console.log("arr", arr);
                    //     const partition1 = Object.values(arr[0]); // 2d array of all different outputs in a/b/..
                    //     console.log(partition1);
                    //     for (const arr2 of Object.values(partitionsByLevel[levelNum])) {
                    //         const partition2 = Object.values(arr2[0]);
                    //
                    //         console.log(Object.keys(arr2)[0])
                    //     }
                    // }
                }
            }

            comparePartitions(partitionsByLevel);
            console.log("ALL DA KEYS", fds);


            /**
             * Get candidate keys from TANE FD output
             */
            function getCandidateKeys(fds: FD[], allAttrs: string[]): string[][] {
                // Step 1: Get all LHS sets that determine all attributes
                let superKeys: string[][] = fds
                    .map(fd => fd.lhs)
                    .filter(lhs => {
                        // compute closure of lhs
                        const closureSet = closure(lhs, fds);
                        return allAttrs.every(attr => closureSet.has(attr));
                    });

                // Step 2: Remove duplicates
                superKeys = superKeys.filter((lhs, idx, arr) =>
                    idx === arr.findIndex(other => other.join(',') === lhs.join(','))
                );

                // Step 3: Keep only minimal sets (no subset of another superkey)
                const candidateKeys: string[][] = superKeys.filter(lhs =>
                    !superKeys.some(other =>
                        other.length < lhs.length && other.every(attr => lhs.includes(attr))
                    )
                );

                return candidateKeys;
            }

            /**
             * Closure function (you already have this)
             */
            function closure(attributes: string[], fds: FD[]): Set<string> {
                const result = new Set(attributes);
                let changed = true;

                while (changed) {
                    changed = false;
                    for (const fd of fds) {
                        const lhsSet = new Set(fd.lhs);
                        const rhsSet = new Set(fd.rhs);

                        // if lhs ⊆ result and rhs has something new
                        if ([...lhsSet].every(attr => result.has(attr))) {
                            for (const attr of rhsSet) {
                                if (!result.has(attr)) {
                                    result.add(attr);
                                    changed = true;
                                }
                            }
                        }
                    }
                }

                return result;
            }



            const candidateKeys = getCandidateKeys(fds, arrAttributeNames);
            console.log("Candidate Keys:", candidateKeys);


            // function that removes candidate keys from




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

            <div>
                deez nuts rofl XD
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
