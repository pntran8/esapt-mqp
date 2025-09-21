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

    function getPowerSet (set: Set<string>) :string[][] {
        if (set.size === 0) {
            return [[]];
        }

        const arr = Array.from(set);

        const subsets: string[][] = [];

        const firstElement = arr[0];
        const remainingArray = arr.slice(1);
        const remainingSet: Set<string> = new Set(remainingArray);


        getPowerSet(remainingSet).forEach((item) => {
            subsets.push(item);
            subsets.push([firstElement, ...item]);
        })

        console.log("length", subsets.length);
        return subsets;

    }

    function subsetToKey(subset: Iterable<string>): string {
        return Array.from(subset).sort().join(",");
    }


    function partitionsAllLevels  (allAttributes: Set<string>, rhsPlusMap: Map<string, Set<string>>, rows : any[], powerSet : string[][]){
        let partitionsByLevel = new Map<number, Map<string, number[][]>>();

        for (const subset of powerSet) { // iterate through subsets (ie studentid, studentname, [studentid, studentname])
            const partitionMap = new Map<string, number[]>();   // we want partition to be {studentid: {[0],[1]}}
            // const currentSubset = powerSet[i]; // current subset
            if (subset.length === 0){
                continue;
            }
            const subsetSet = new Set(subset);
            computeRHS(subsetSet, allAttributes, subset.length, rhsPlusMap);
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
            const subsetKey = subsetToKey(subset);

            if (!partitionsByLevel.has(subset.length)) { // this level been defined alr? if no
                partitionsByLevel.set(subset.length, new Map()); // make new key value pair of level
            }
            partitionsByLevel.get(subset.length)!.set(subsetKey, partition);  // add partitions to it


        }

        return partitionsByLevel;

    }




    function getArrayIntersection<T>(arr1: T[], arr2: T[]): T[] {
        return arr1.filter(item => arr2.includes(item));
    }

    function getUnionPartition(p1: number[][], p2: number[][]): number[][] {
        const union: number[][] = [];

        for (const group1 of p1) {
            for (const group2 of p2) {
                // intersect each group from p1 with each from p2
                const intersection = group1.filter(x => group2.includes(x));
                if (intersection.length > 0) {
                    union.push(intersection);
                }
            }
        }

        return union;
    }

    function checkEquivalence(partition1: number[][], partition2: number[][]): boolean {
        const unionPartition = getUnionPartition(partition1, partition2);

        // size needs to match
        if (partition1.length !== unionPartition.length) {
            return false;
        }

        // does every group in partition1 exists in unionPartition??
        const unionAsStrings = unionPartition.map(g => g.slice().sort().join(","));
        const setUnion = new Set(unionAsStrings);

        for (const group of partition1) {
            const key = group.slice().sort().join(",");
            if (!setUnion.has(key)) {
                return false;
            }
        }

        return true;
    }




    function pruneBySuperKeys(levelNum: number, partitionsByLevel: Map<number, Map<string, number[][]>>, key1: string, level: Map<string, number[][]>) {
        for (let i = levelNum; i < partitionsByLevel.size; i++) { // go up the ladder from where we found superkey
            const key1Set = new Set(key1.split(","));
            const currentLevel = partitionsByLevel.get(i); // subsets and their partitions

            if (!currentLevel || currentLevel.size === 0) continue; // if nothing in that level, just go to next level (if exists)

            console.log("Current level:", currentLevel);

            // copy of keys
            const keys = Array.from(currentLevel.keys());
            for (const key of keys) {
                // console.log("Checking key:", key);
                // console.log("key1:", key1);

                if (currentLevel === level) continue; // skip same level

                const keySet = new Set(key.split(","));
                let isSuperset = true;

                // Check that every attribute in key1 is also present in key
                for (const attr of key1Set) {
                    if (!keySet.has(attr)) {
                        isSuperset = false;
                        break; // no need to check further
                    }
                }

                if (isSuperset) {
                    console.log(`Deleting key "${key}" from currentLevel`);
                    currentLevel.delete(key);
                }
            }
        }
    }


    function subtractStringSets(setA: Set<string>, setB: Set<string>): Set<string> {
        const difference = new Set<string>();
        for (const element of setA) {
            if (!setB.has(element)) {
                difference.add(element);
            }
        }
        return difference;
    }

    function computeRHS (subset: Set<string>, allAttributes:Set<string>, level:number, rhsPlusMap:Map<string, Set<string>>){
        let difference = subtractStringSets(allAttributes, subset);
        if (level == 1){
            rhsPlusMap.set(subsetToKey(subset), new Set(difference));
            return;
        }
        else{
            // get RHS+ for each immediate subset of X from rhsPlusMap
            // yeah but i have subset as a string rn
            // immediate subsets are level-1. do i change  rhsPlusMap to a Map<number, <string, number[]>> where the first number is the level. would that work

            // making the immediate subsets
            const immediateSubset: Set<string>[] = [];
            for (const attr of subset) {
                let copiedSet: Set<string> = new Set(subset);
                copiedSet.delete(attr);
                immediateSubset.push(copiedSet);
            }

            // now we want like an array of the possibleRHS for each immediate subset
            const allPossibleRHS : string[][] = [];
            for (const ss in immediateSubset){
                const possibleRHS = rhsPlusMap.get(subsetToKey(immediateSubset[ss]))?? new Set<string>();
                allPossibleRHS.push(Array.from(possibleRHS));
            }

            let current = allPossibleRHS[0];
            for (let i = 1; i < allPossibleRHS.length; i++) {
                current = getArrayIntersection(current, allPossibleRHS[i]);
            }

            let diffArray = Array.from(difference)
            diffArray = getArrayIntersection(diffArray, current);

            rhsPlusMap.set(subsetToKey(subset), new Set(diffArray));

        }
    }

    // ----------------------------------------------------------

    // Function 2: generate levels and check dependencies
    // for each subset in level i:
    //     grab RHS+ of that subset (THIS IS WHERE FUNCTION 1 WOULD BE CALLED)
    //     for RHS in RHS+:
    //         check equivalency: does LHS -> RHS actually hold?
    //             -> if yes, record FD
    //             -> if no, prune RHS from RHS+




    function isSuperKey(partition: number[][], totalRows: number): boolean {
        return partition.length === totalRows;
    }

    function discoverFDs(
        allAttributes: Set<string>,
        rhsPlusMap: Map<string, Set<string>>,
        partitionsByLevel: Map<number, Map<string, number[][]>>,
        totalRows: number  // <-- new argument
    ): [string, string][] {
        const fds: [string, string][] = [];

        for (const [level, subsetsMap] of partitionsByLevel.entries()) {
            for (const [subsetKey, partitionX] of subsetsMap.entries()) {
                const subset = new Set(subsetKey.split(",").filter(x => x.length > 0));

                // 🔹 use totalRows instead of sanitizedData.length
                if (isSuperKey(partitionX, totalRows)) {
                    // add key -> all other attributes
                    const remainingAttrs = Array.from(allAttributes).filter(a => !subset.has(a));
                    for (const attr of remainingAttrs) {
                        fds.push([subsetKey, attr]);
                    }
                    pruneBySuperKeys(level, partitionsByLevel, subsetKey, subsetsMap);
                    continue;
                }


                const rhsSet = rhsPlusMap.get(subsetKey);
                if (!rhsSet) continue;

                for (const A of rhsSet) {
                    const extended = new Set(subset);
                    extended.add(A);
                    const extendedKey = subsetToKey(extended);

                    const partitionXA = subsetsMap.get(extendedKey)
                        ?? partitionsByLevel.get(level + 1)?.get(extendedKey);
                    if (!partitionXA) continue;

                    const holds = checkEquivalence(partitionX, partitionXA);

                    if (holds) {
                        fds.push([subsetKey, A]);
                    } else {
                        rhsSet.delete(A);
                    }
                }
            }
        }

        return fds;
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
            if (!sanitizedData || sanitizedData.length === 0) return;

            // attribute names as a Set<string>
            const attributeNames = new Set<string>(Object.keys(sanitizedData[0]));
            const powerSet = getPowerSet(attributeNames);

            // RHS+ map (empty to start; computeRHS writes into this when called inside partitionsAllLevels)
            const rhsPlusMap = new Map<string, Set<string>>();

            // build partitions AND compute RHS+ for every subset (partitionsAllLevels calls computeRHS)
            const partitionsByLevel = partitionsAllLevels(attributeNames, rhsPlusMap, sanitizedData, powerSet);

            // now discover FDs using the filled partitions + rhsPlusMap
            const fds = discoverFDs(attributeNames, rhsPlusMap, partitionsByLevel, sanitizedData.length);

            console.log("Sanitized data:", sanitizedData);
            console.log("Partitions by level:", partitionsByLevel);
            console.log("RHS+ map:", rhsPlusMap);
            console.log("Discovered FDs:", fds);



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

            {/* show parsed CSV as a table */}
            <div className="p-10 overflow-x-auto">
                {data.length > 0 ? (
                    <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-100">
                        <tr>
                            {Object.keys(data[0]).map((key) => (
                                <th
                                    key={key}
                                    className="border px-4 py-2 text-left"
                                >
                                    {key}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                            >
                                {Object.keys(row).map((key) => (
                                    <td key={key} className="border px-4 py-2">
                                        {row[key]?.toString() ?? ""}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-center mt-4">Upload a CSV to see results</p>
                )}
                <button className={"text-[#BD0A0A]"}>
                    singsong
                </button>
            </div>


            {/* show parsed CSV */}
            {/*<div className="p-4">*/}
            {/*    {data.length > 0 ? (*/}
            {/*        <pre>{JSON.stringify(data, null, 2)}</pre>*/}
            {/*    ) : (*/}
            {/*        <p className="text-center mt-4">Upload a CSV to see results</p>*/}
            {/*    )}*/}
            {/*</div>*/}

            <Footer />
        </>
    );
};

export default Normalization;


// function buildLevels (powerSet :any[]) {
//     let levels = new Map<number, any[]>();    // should be like {1:{{a},{b}}, 2:{{a,b}}
//     for (let subset of powerSet) { // a, b, ...
//         const size = subset.length;
//
//         if (!levels.has(size)) {
//             levels.set(size, []);
//         }
//         levels.get(size)!.push(subset);
//     }
//
//     return levels;
// }

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


// function checkEquivalence(partition1: Record<string, any[]>, partition2: Record<string, any[]>) : boolean {
//     const equal = partition1.every(block1 =>
//         partition2.some(block2 =>
//             block1.every(idx => block2.includes(idx))
//         )
//     );
//     return equal;
// }

// function checkEquivalence(partition1: Record<string, any[]>, partition2: Record<string, any[]>) : boolean {
//     const equal = partition1.every(block1 =>
//         partition2.some(block2 =>
//             block1.every(idx => block2.includes(idx))
//         )
//     );
//     return equal;
// }


// function getUnionPartition(arr1: number[][], arr2: number[][]): number[][] {
//     // arr1 is number[][], arr2 is number[][] too
//     const union = new Set<string>();
//     for (let arr of arr1){
//         for (let array of arr2){
//             const intersection = getArrayIntersection(arr, array);
//             if (intersection.length > 0){
//                 union.add(intersection.join(","));
//             }
//         }
//     }
//
//     return Array.from(union, key => key.split(",").map(Number));
// }


// single dependency
// function checkEquivalence(partition1: Map<string, number[][]>, partition2: Map<string, number[][]>) : boolean {
//     const unionPartition = new Set<string>();
//     partition1.forEach((value1) => {
//         partition2.forEach(value2 => {
//             const union = getUnionPartition(value1, value2);
//             union.forEach(group => {
//                 unionPartition.add(group.join(","));
//             });
//
//         })
//     })
//
//     // first we need the union partition
//     // how? we want to check values of partition1, see if they exist (even if theyre apart of a populated array (like we just care if it exists, doesn't matter if its [1] or [1,0,2]
//     // get the intersection of them
//     // add it to union partition
//
//
//     const combined1 = Array.from(partition1.values()).map(g => g.join(","));
//     const combined2 = Array.from(partition2.values()).map(g => g.join(","));
//
//
//     // first we check the length
//     if (combined1.length != combined2.length) {
//         return false;
//     }
//
//     //then the values - partition1 vs unionpartition
//     // for arr of partition1
//     //   for partition of unionPartition
//     //     if lengths not the same, return false
//     //     if lengths are the same
//     //          for val of arr
//     //              for val2 in partition
//     //                  val === val2? if yes continue, if no return false
//
//     const set2 = new Set(combined2)
//     for (let combined of combined1) {
//         if(!set2.has(combined)){
//             return false;
//         }
//     }
//
//     return true;
//
// }

// function pruneBySuperKeys(levelNum: number, partitionsByLevel: Record<string, any[]>, key1: string, level: any[]) {
//     for (let i = levelNum; i < Object.keys(partitionsByLevel).length; i++) {
//         const currentLevel = partitionsByLevel[i];
//
//         if (Object.keys(currentLevel).length === 0) continue;
//
//         console.log("Current level:", currentLevel);
//
//         // copy of keys
//         const keys = Object.keys(currentLevel);
//         for (const key of keys) {
//             // console.log("Checking key:", key);
//             // console.log("key1:", key1);
//
//             if (key.includes(key1) && currentLevel !== level) {
//                 console.log(`Deleting key "${key}" from currentLevel`);
//                 delete currentLevel[key];
//             }
//         }
//     }
// }

// rhs+ pruning
// Function 1: compute RHS+ for a subset
// to get possible RHSs (gonna call it RHS+)
// first, get the set of all attributes
// then, get the set of attributes in the current subset X
// set of all attributes - set of attributes in X -> base RHS+
// make another constant previousRHS+ (empty for now)

// EDITED: only do the intersection part if level > 1
// if level > 1:
//     for each immediate subset Y of the current subset X (size = subset size - 1) from level - 1
//         get the RHS+ saved to Y
//         append or intersect that RHS+ with previousRHS+
//     RHS+ = RHS+ ∩ intersection of all previousRHS+ sets
// else (level 1):
//     RHS+ = base RHS+ (no intersection needed)

// for RHS in RHS+
//     if RHS is in intersection (for level > 1) or in base RHS+ (for level 1)
//         -> keep it
//     else
//         -> remove from possible RHS

// ----------------------------------------------------------

// Function 2: generate levels and check dependencies
// for each subset in level i:
//     grab RHS+ of that subset (THIS IS WHERE FUNCTION 1 WOULD BE CALLED)
//     for RHS in RHS+:
//         check equivalency: does LHS -> RHS actually hold?
//             -> if yes, record FD
//             -> if no, prune RHS from RHS+


// const sanitizedData = sanitizeColumns(data);
// setData(sanitizedData);
// console.log("sanitized data, ", sanitizedData);
// const powerSet = getPowerSet(attributeNames);
// const arrAttributeNames = Array.from(attributeNames);
// console.log("power set", powerSet);
//
//
//
// // partitions by levels
// // let levels = buildLevels(powerSet);  // should be like {1:{{a},{b}}, 2:{{a,b}}
// //
// //
// // console.log("levels ", levels);
// //
// //
// // console.log("array power set: ", arrAttributeNames);
//
// const partitionsByLevel = partitionsAllLevels(sanitizedData, powerSet);
// // const allPartitions : Record<string, any[]> = {};
//
//
// // console.log("allPartitions ", allPartitions);
// console.log("partitions by level, ", partitionsByLevel)
// console.log("length, ", Object.keys(partitionsByLevel).length)
//
// type FD = {
//     lhs: string[];
//     rhs: string[];
// };
//
// const fds: FD[] = [];
//
// function comparePartitions (partitionsByLevel : Record<string, any[]>){
//     for (let levelNum = 1; levelNum < Object.keys(partitionsByLevel).length; levelNum++){ // level
//         const level = partitionsByLevel[levelNum];
//         if (Object.keys(level).length === 0) continue;
//         console.log(`LEVEL ${levelNum}`, level);
//         // [a: Array(1), b: Array(1), c: Array(1), d: Array(1)]
//
//         for (const [key1, partition1] of Object.entries(level)) {
//             for (const [key2, partition2] of Object.entries(partitionsByLevel[1])) {
//                 console.log(`Testing ${key1} -> ${key2}`);
//
//                 // key2.includes(key1)
//                 if (key1.includes(key2)){
//                     // want it to ignore it, since its trivial
//                     console.log(`Trivial`);
//                 }
//                 // else if (partition1.length !== partition2.length){
//                 //     // ignore it, since if length not the same they clearly not equal
//                 //     console.log(`NOPE! ${key1} ! -> ${key2}`);
//                 // }
//                 else {
//                     // length is equal.
//                     // const combinedArray = partition1.concat(partition2);
//                     function normalize(rows: any[][]): Set<string> {
//                         return new Set(rows.map(r => JSON.stringify(r)));
//                     }
//
//                     const set1 = normalize(partition1);
//                     const set2 = normalize(partition2);
//
//                     // equal if they have the same size and every row from set1 is in set2
//                     if (checkEquivalence (partition1, partition2)) {
//                         console.log("Partitions are equivalent!");
//                         fds.push({ lhs: key1.split(","), rhs: key2.split(",") });
//                         if (set1.size === sanitizedData.length) {
//                             console.log("this is also a superkey i think idk im a little lost");
//                             pruneBySuperKeys(levelNum, partitionsByLevel, key1, level);
//                         }
//                     }
//                     else{
//                         console.log("Partitions are not equivalent!");
//                     }
//
//
//                 }
//
//             }
//
//         }
//     }
// }
//
// comparePartitions(partitionsByLevel);
// console.log("ALL DA KEYS", fds);
//
//
//
//
//
//
//
//
//
//
//
//
//
// //////////////////////////////////////////
//
// function groupFDsByLHS(fds: FD[]): Record<string, string[]> {
//     const lhsMap: Record<string, string[]> = {};
//
//     for (const fd of fds) {
//         const key = fd.lhs.join(","); // stringify LHS as key
//         if (!lhsMap[key]) {
//             lhsMap[key] = [];
//         }
//         lhsMap[key].push(...fd.rhs);
//     }
//
//     return lhsMap;
// }
//
// function computeClosure(attrs: string[], fds: { lhs: string[], rhs: string[] }[]): string[] {
//     const closure = new Set(attrs);
//     let updated = true;
//
//     while (updated) {
//         updated = false;
//         for (const fd of fds) {
//             // if lhs ⊆ closure
//             if (fd.lhs.every(a => closure.has(a))) {
//                 for (const r of fd.rhs) {
//                     if (!closure.has(r)) {
//                         closure.add(r);
//                         updated = true;
//                     }
//                 }
//             }
//         }
//     }
//     return Array.from(closure);
// }
//
//
// function identifyCandidateKeys(
//     lhsMap: Record<string, string[]>,
//     allAttrs: string[],
//     fds: { lhs: string[], rhs: string[] }[]
// ) {
//     const superKeys: string[][] = [];
//     const otherKeys: Record<string, string[]> = { ...lhsMap };
//
//     for (const lhsStr of Object.keys(lhsMap)) {
//         const lhsAttrs = lhsStr.split(",");
//
//         // 🚀 compute full closure
//         const closure = computeClosure(lhsAttrs, fds);
//
//         if (closure.length === allAttrs.length) {
//             superKeys.push(lhsAttrs);
//             delete otherKeys[lhsStr];
//         }
//     }
//
//     // ✅ Filter to minimal candidate keys
//     const candidateKeys = superKeys.filter(
//         key => !superKeys.some(
//             other =>
//                 other.length < key.length &&
//                 other.every(attr => key.includes(attr))
//         )
//     ).map(k => k.join(",")); // stringify to match your old output
//
//     return { candidateKeys, otherKeys };
// }
//
//
//
// const lhsMap = groupFDsByLHS(fds);
// // const results = identifyCandidateKeys(lhsMap, arrAttributeNames, fds);
// // console.log("BANG!", results);
//
//
//
//
// function getShortestCandidateKeys(candidateKeys: string[]): string[] {
//     if (candidateKeys.length === 0) return [];
//
//     const lengths = candidateKeys.map(key => key.split(",").length);
//     const minLength = Math.min(...lengths);
//
//     return candidateKeys.filter(key => key.split(",").length === minLength);
// }
//
// // console.log("shortest candidate keys", getShortestCandidateKeys(results.candidateKeys))
// // console.log("other fds", results.otherKeys);
//
// function findTransitiveDependencies(
//     fds: { lhs: string[], rhs: string[] }[],
//     candidateKeys: string[],
//     nonPrimes: string[]
// ) {
//     const transitives: { through: string, to: string }[] = [];
//
//     for (const key of candidateKeys) {
//         for (const np of nonPrimes) {
//             // check if key -> np
//             if (fds.some(fd => fd.lhs.length === 1 && fd.lhs[0] === key && fd.rhs.includes(np))) {
//                 for (const np2 of nonPrimes) {
//                     if (np !== np2) {
//                         // check if np -> np2
//                         if (fds.some(fd => fd.lhs.length === 1 && fd.lhs[0] === np && fd.rhs.includes(np2))) {
//                             // deduplicate by pair (through, to)
//                             if (!transitives.some(t => t.through === np && t.to === np2)) {
//                                 transitives.push({ through: np, to: np2 });
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     }
//
//     return transitives;
// }
//
// const results = identifyCandidateKeys(lhsMap, arrAttributeNames, fds);
// const candidateKeys = results.candidateKeys.map(k => k.split(",")[0]);
// console.log("Candidate Keys:" + candidateKeys);
// const nonPrimes = arrAttributeNames.filter(a => !candidateKeys.includes(a));
//
// const transDeps = findTransitiveDependencies(fds, candidateKeys, nonPrimes);
// console.log("Transitive dependencies:", transDeps);
//


