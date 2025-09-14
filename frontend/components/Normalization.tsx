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

    function buildLevels (powerSet :any[]) {
        let levels = new Map<number, any[]>();    // should be like {1:{{a},{b}}, 2:{{a,b}}
        for (let subset of powerSet) { // a, b, ...
            const size = subset.length;

            if (!levels.has(size)) {
                levels.set(size, []);
            }
            levels.get(size)!.push(subset);
        }

        return levels;
    }

    // function partitionsAllLevels  (rows : any[], powerSet : any[]){
    //     const partitionsByLevel : Record <string, any[]> = {};
    //     for (let i = 0; i < powerSet.length; i++) {// iterate through subsets (ie a,b, a, whatever)
    //         const partition : Record<string, any[]> = {};
    //         const currentSubset = powerSet[i]; // current subset
    //         for (let j = 0; j < rows.length; j++){ // for row in rows
    //             let row = rows[j]; // single tuple
    //             const key = currentSubset.map(attr => row[attr]).join(',');
    //
    //             if (partition.hasOwnProperty(key)) { // this combination alr exists
    //                 partition[key].push(j); // add to combination
    //             }
    //             else{
    //                 partition[key] = [j]; // combination doesn't exist, just append to whole thing
    //             }
    //
    //         }
    //
    //         if (!partitionsByLevel[powerSet[i].length]) {
    //             partitionsByLevel[powerSet[i].length] = []; // if it bugs out try {} instead of []
    //         }
    //
    //         partitionsByLevel[powerSet[i].length][currentSubset.toString()] = partition;
    //     }
    //
    //     return partitionsByLevel;
    //
    // }

    // powerSet [{}, {studentid}, {studentname}, {studentid, studentname}]
    // outcome: {1: {studentid: {[0],[1]}}
            //      {studentname: {[0], [1]}}
            //   2: {studentid,studentname: {[0],[1]}}
            // }




    function partitionsAllLevels  (rows : any[], powerSet : any[]){
        let partitionsByLevel = new Map<number, { subset: string[], partition: number[][] }[]>();

        for (const subset of powerSet) { // iterate through subsets (ie studentid, studentname, [studentid, studentname])
            const partitionMap = new Map<string, number[]>();   // we want partition to be {studentid: {[0],[1]}}
            // const currentSubset = powerSet[i]; // current subset
            for (let j = 0; j < rows.length; j++){ // for row in rows

                // i need the value of the subset in the row.
                // check the row's subset's value
                const row = rows[j];
                let rowValue = [];
                for (let attr of subset){
                    rowValue.push(row[attr]);
                }
                const key = JSON.stringify(rowValue);


                if (!partitionMap.has(key)) { // if combination of values doesn't exist
                    partitionMap.set(key, []) // make new key value pair
                }

                partitionMap.get(key)!.push(j); // append value to key associated

            }

            const partition = Array.from(partitionMap.values());


            if (!partitionsByLevel.has(subset.length)) { // this level been defined alr? if no
                partitionsByLevel.set(subset.length, []); // make new key value pair of level
            }

            partitionsByLevel.get(subset.length)!.push({ subset, partition }); // add partitions to it

        }

        return partitionsByLevel;

    }



    function checkEquivalence(partition1: Record<string, any[]>, partition2: Record<string, any[]>) : boolean {
        const equal = partition1.every(block1 =>
            partition2.some(block2 =>
                block1.every(idx => block2.includes(idx))
            )
        );
        return equal;
    }

    function pruneBySuperKeys(levelNum: number, partitionsByLevel: Record<string, any[]>, key1: string, level: any[]) {
        for (let i = levelNum; i < Object.keys(partitionsByLevel).length; i++) {
            const currentLevel = partitionsByLevel[i];

            if (Object.keys(currentLevel).length === 0) continue;

            console.log("Current level:", currentLevel);

            // copy of keys
            const keys = Object.keys(currentLevel);
            for (const key of keys) {
                // console.log("Checking key:", key);
                // console.log("key1:", key1);

                if (key.includes(key1) && currentLevel !== level) {
                    console.log(`Deleting key "${key}" from currentLevel`);
                    delete currentLevel[key];
                }
            }
        }
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
            let levels = buildLevels(powerSet);  // should be like {1:{{a},{b}}, 2:{{a,b}}


            console.log("levels ", levels);


            console.log("array power set: ", arrAttributeNames);

            const partitionsByLevel = partitionsAllLevels(sanitizedData, powerSet);
            // const allPartitions : Record<string, any[]> = {};


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
                    if (Object.keys(level).length === 0) continue;
                    console.log(`LEVEL ${levelNum}`, level);
                    // [a: Array(1), b: Array(1), c: Array(1), d: Array(1)]

                    for (const [key1, partition1] of Object.entries(level)) {
                        for (const [key2, partition2] of Object.entries(partitionsByLevel[1])) {
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
                                if (checkEquivalence (partition1, partition2)) {
                                    console.log("Partitions are equivalent!");
                                    fds.push({ lhs: key1.split(","), rhs: key2.split(",") });
                                    if (set1.size === sanitizedData.length) {
                                        console.log("this is also a superkey i think idk im a little lost");
                                        pruneBySuperKeys(levelNum, partitionsByLevel, key1, level);
                                    }
                                }
                                else{
                                    console.log("Partitions are not equivalent!");
                                }


                            }

                        }

                    }
                }
            }

            comparePartitions(partitionsByLevel);
            console.log("ALL DA KEYS", fds);





            function groupFDsByLHS(fds: FD[]): Record<string, string[]> {
                const lhsMap: Record<string, string[]> = {};

                for (const fd of fds) {
                    const key = fd.lhs.join(","); // stringify LHS as key
                    if (!lhsMap[key]) {
                        lhsMap[key] = [];
                    }
                    lhsMap[key].push(...fd.rhs);
                }

                return lhsMap;
            }

            function computeClosure(attrs: string[], fds: { lhs: string[], rhs: string[] }[]): string[] {
                const closure = new Set(attrs);
                let updated = true;

                while (updated) {
                    updated = false;
                    for (const fd of fds) {
                        // if lhs ⊆ closure
                        if (fd.lhs.every(a => closure.has(a))) {
                            for (const r of fd.rhs) {
                                if (!closure.has(r)) {
                                    closure.add(r);
                                    updated = true;
                                }
                            }
                        }
                    }
                }
                return Array.from(closure);
            }


            function identifyCandidateKeys(
                lhsMap: Record<string, string[]>,
                allAttrs: string[],
                fds: { lhs: string[], rhs: string[] }[]
            ) {
                const superKeys: string[][] = [];
                const otherKeys: Record<string, string[]> = { ...lhsMap };

                for (const lhsStr of Object.keys(lhsMap)) {
                    const lhsAttrs = lhsStr.split(",");

                    // 🚀 compute full closure
                    const closure = computeClosure(lhsAttrs, fds);

                    if (closure.length === allAttrs.length) {
                        superKeys.push(lhsAttrs);
                        delete otherKeys[lhsStr];
                    }
                }

                // ✅ Filter to minimal candidate keys
                const candidateKeys = superKeys.filter(
                    key => !superKeys.some(
                        other =>
                            other.length < key.length &&
                            other.every(attr => key.includes(attr))
                    )
                ).map(k => k.join(",")); // stringify to match your old output

                return { candidateKeys, otherKeys };
            }



            const lhsMap = groupFDsByLHS(fds);
            // const results = identifyCandidateKeys(lhsMap, arrAttributeNames, fds);
            // console.log("BANG!", results);




            function getShortestCandidateKeys(candidateKeys: string[]): string[] {
                if (candidateKeys.length === 0) return [];

                const lengths = candidateKeys.map(key => key.split(",").length);
                const minLength = Math.min(...lengths);

                return candidateKeys.filter(key => key.split(",").length === minLength);
            }

            // console.log("shortest candidate keys", getShortestCandidateKeys(results.candidateKeys))
            // console.log("other fds", results.otherKeys);

            function findTransitiveDependencies(
                fds: { lhs: string[], rhs: string[] }[],
                candidateKeys: string[],
                nonPrimes: string[]
            ) {
                const transitives: { through: string, to: string }[] = [];

                for (const key of candidateKeys) {
                    for (const np of nonPrimes) {
                        // check if key -> np
                        if (fds.some(fd => fd.lhs.length === 1 && fd.lhs[0] === key && fd.rhs.includes(np))) {
                            for (const np2 of nonPrimes) {
                                if (np !== np2) {
                                    // check if np -> np2
                                    if (fds.some(fd => fd.lhs.length === 1 && fd.lhs[0] === np && fd.rhs.includes(np2))) {
                                        // deduplicate by pair (through, to)
                                        if (!transitives.some(t => t.through === np && t.to === np2)) {
                                            transitives.push({ through: np, to: np2 });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                return transitives;
            }

            const results = identifyCandidateKeys(lhsMap, arrAttributeNames, fds);
            const candidateKeys = results.candidateKeys.map(k => k.split(",")[0]);
            console.log("Candidate Keys:" + candidateKeys);
            const nonPrimes = arrAttributeNames.filter(a => !candidateKeys.includes(a));

            const transDeps = findTransitiveDependencies(fds, candidateKeys, nonPrimes);
            console.log("Transitive dependencies:", transDeps);




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

            {/*<div>*/}
            {/*    deez nuts rofl XD*/}
            {/*</div>*/}

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
