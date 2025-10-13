import React, {useState} from "react";
import Papa from "papaparse";
import Header from "./Header";
import Footer from "./Footer";

const Normalization = () => {
    const [data, setData] = useState<any[]>([]);
    const [pk, setPK] = useState<string>("");
    const [popUp, setPopUp] = useState<boolean>(false);
    const [transitiveDependencies, setTransitiveDependencies] = useState<string[][]>([]);
    const [minimalKeys, setMinimalKeys] = useState<string[]>([]);
    const [fdsRewritten, setFdsRewritten] = useState(new Map());
    const [candidateKeys, setCandidateKeys] = useState<string[]>([]);
    const [splitDatasetResult, setSplitDatasetResult] = useState<any[]>([]);
    const [usedInSplitting, setUsedInSplitting] = useState<string>(true);
    const [partialDependencies, setPartialDependencies] = useState<any[]>([]);
    const [Tables3NFFrom, setTablesFrom3NF] = useState<any[]>([]);
    const [Tables3NFAfter, setAfter3NF] = useState<Set<string>>([]);
    const [nTables, setNormalizedTables] = useState<any[]>([]);
    const [attrNames, setAttrNames] = useState<Set<string>>([]);
    const [listTransitiveDependencies, setListTransitiveDependencies] = useState<string[][]>([]);
    const [listPartialDependencies, setListPartialDependencies] = useState<string[][]>([]);

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


    function subsetToKey(subset: Iterable<string>): string {
        return Array.from(subset).sort().join(",");
    }



    function computePartition(subset: Set<string>, rows: any[]): number[][] {
        const partitionMap = new Map<string, number[]>();

        for (let j = 0; j < rows.length; j++) {
            const row = rows[j];
            const rowValue: any[] = [];

            for (const attr of subset) {
                rowValue.push(row[attr]);
            }

            const key = JSON.stringify(rowValue);

            if (!partitionMap.has(key)) {
                partitionMap.set(key, []);
            }
            partitionMap.get(key)!.push(j);
        }

        return Array.from(partitionMap.values());
    }

    function generatePartitionsByLevel(
        attributeNames: Set<string>,
        rows: any[]
    ): { partitionsByLevel: Map<number, Map<string, number[][]>>, rhsPlusMap: Map<string, Set<string>>, superKeys: Set<string> } {

        const superKeys = new Set<string>();
        const partitionsByLevel = new Map<number, Map<string, number[][]>>();
        const rhsPlusMap = new Map<string, Set<string>>();

        // LEVEL 1
        const level1 = new Map<string, number[][]>();
        const prevLevelSubsets: Set<string>[] = [];

        for (const attr of attributeNames) {
            const subset = new Set([attr]);
            prevLevelSubsets.push(subset);

            const partition = computePartition(subset, rows);
            level1.set(subsetToKey(subset), partition);
            computeRHS(subset, attributeNames, 1, rhsPlusMap);
        }
        partitionsByLevel.set(1, level1);

        // LEVEL 2+
        let level = 2;
        while (prevLevelSubsets.length > 1) {
            const currentLevel = new Map<string, number[][]>();

            for (let i = 0; i < prevLevelSubsets.length; i++) {
                for (let j = i + 1; j < prevLevelSubsets.length; j++) {
                    const union = new Set([...prevLevelSubsets[i], ...prevLevelSubsets[j]]);
                    if (union.size !== level) continue;

                    const key = subsetToKey(union);
                    const partition = computePartition(union, rows);

                    currentLevel.set(key, partition);
                    computeRHS(union, attributeNames, level, rhsPlusMap);

                }
            }

            if (currentLevel.size === 0) break;

            partitionsByLevel.set(level, currentLevel);

            prevLevelSubsets.splice(
                0,
                prevLevelSubsets.length,
                ...Array.from(currentLevel.keys()).map(k => new Set(k.split(",")))
            );

            level++;
        }

        return { partitionsByLevel, rhsPlusMap, superKeys };
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

                // checking that every attribute in key1 is also present in key
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

    function computeRHS (subset: Set<string>, allAttributes:Set<string>, level:number, rhsPlusMap:Map<string, Set<string>>) {
        let difference = subtractStringSets(allAttributes, subset);
        if (level == 1) {
            rhsPlusMap.set(subsetToKey(subset), new Set(difference));
            return;
        } else {
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
            const allPossibleRHS: string[][] = [];
            for (const ss in immediateSubset) {
                const possibleRHS = rhsPlusMap.get(subsetToKey(immediateSubset[ss])) ?? new Set<string>();
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


    function isSuperKey(partition: number[][], totalRows: number): boolean {
        return partition.length === totalRows;
    }

    function discoverFDs(
        allAttributes: Set<string>,
        rhsPlusMap: Map<string, Set<string>>,
        partitionsByLevel: Map<number, Map<string, number[][]>>,
        totalRows: number
    ): [string, string][] {
        const fds: [string, string][] = [];

        for (const [level, subsetsMap] of partitionsByLevel.entries()) {
            for (const [subsetKey, partitionX] of subsetsMap.entries()) {
                const subset = new Set(subsetKey.split(",").filter(x => x.length > 0));

                if (isSuperKey(partitionX, totalRows)) {
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
                        console.log("deleted this rhs", A)
                        rhsSet.delete(A);
                    }
                }
            }
        }

        return fds;
    }

    // for each side
    // iterate through left side
    // take count of how many times it went thru
    // if it went thru size of attr - num of things on right string
    // save as candidate key
    // then after that's found, we find minimal key- counting number of attributes on each of the stuff just collected
    // have an empty array
    // current smallest = 100
    // check array against current largest
    // save to array only ones that are smaller OR equivalent

    function rewriteFDs(fds: [string, string][]) {
        const fds_rewritten = new Map<string, string[]>;
        for (const fd of fds) {

            const lhs = fd[0];
            const rhs = fd[1];
            if (fds_rewritten.has(lhs)) {

                const rhsArr = fds_rewritten.get(lhs);
                console.log("fd", fd)
                console.log("rhsArr", rhsArr)
                if (rhsArr) {
                    rhsArr.push(rhs);
                    fds_rewritten.set(lhs, rhsArr);
                }

            } else {
                fds_rewritten.set(lhs, [rhs]);
            }

        }
        return fds_rewritten;
    }


    // naming is wrong this is lowkey getSuperkey
    function getCandidateKeys(fds_rewritten: Map<any, any>, numAttr: number) {
        const candidateKeys = new Set<string>;
        for (const key of fds_rewritten.keys()) {
            // now key is the lhs. we need to split it and see how many attr are in lhs.
            // then, we subtract totalAttrs - lhs. if that number is equal to the amount in rhs, then its a candidate key

            const lhsAttrs = key.split(",").filter(x => x.length > 0);
            const AttrLeft = numAttr - lhsAttrs.length;
            const rhsLen = fds_rewritten.get(key)!.length;
            if (AttrLeft == rhsLen) {
                candidateKeys.add(key);
            }
        }
        return candidateKeys;
    }


    function getMinimalKeys(candidateKeys: Set<any>) {
        const minimalKeys = new Set<string>;
        let currentMinimum = 1000;
        for (const key of candidateKeys) {
            const keyLength = key.split(",").filter(x => x.length > 0).length;
            if (keyLength == currentMinimum) {
                minimalKeys.add(key);
            } else if (keyLength < currentMinimum) {
                minimalKeys.clear();
                currentMinimum = keyLength;
                minimalKeys.add(key);
            }
        }
        return minimalKeys;
    }


    // to get transitive dependencies
    // we have fds rewritten
    // remove the candidate keys from fds
    // transtivie dependency becomes pk -> lhs -> rhs

    function getTransitiveDependencies(
        fdsRewritten: Map<string, string[]>,
        candidateKeys: Set<string>,
        primaryKey:string) {
        // remove candidate keys from fds
        const fdsCopy = new Map(fdsRewritten);
        for (const candidateKey of candidateKeys) {
            console.log("candidatekey here", candidateKey)
            if (fdsCopy.has(candidateKey)) {
                console.log("HERE!?")
                console.log("before", fdsRewritten)
                fdsCopy.delete(candidateKey);

                console.log("after", fdsRewritten)
            }
        }

        const transDepen: string[][] = [];
        for (const [lhs, rhs] of fdsCopy){
            const X = new Set(lhs.split(",").filter(x => x.length > 0)); // lhs
            // now we wanna see if lhs is a superkey
            if (!isSuperKeyTransitive(candidateKeys, X)) {
                for (const str of rhs) {
                    if (!candidateKeys.has(str)) {
                        transDepen.push([lhs, str])
                    }
                }
            }
        }
        console.log("is it just not getting here")
        return transDepen;
    }

    function isSuperKeyTransitive (candidateKeys: Set<string>, X : Set<string>): boolean {
        for (const key of candidateKeys) {
            const lhsAttrs = new Set (key.split(",").filter(x => x.length > 0));
            let isSubset = true;
            for (const attr of lhsAttrs) {
                if(!X.has(attr)){
                    isSubset = false;
                    break;
                }
            }

            if (isSubset) {
                return true;
            }
        }
        return false;
    }

    // function splitDataset(sanitizedData, transitiveDependency: string[]) {
    //     const secondDependent = transitiveDependency[0];
    //     const thirdDependent = transitiveDependency[1];
    //
    //     const copySanitized = structuredClone(sanitizedData);
    //
    //     const additionalTableRaw = copySanitized.map(item => ({
    //         [secondDependent]: item[secondDependent],
    //         [thirdDependent]: item[thirdDependent],
    //     }));
    //
    //     const seen = new Set();
    //     const additionalTable = additionalTableRaw.filter(item => {
    //         const key = `${item[secondDependent]}|${item[thirdDependent]}`;
    //         if (seen.has(key)) return false;
    //         seen.add(key);
    //         return true;
    //     });
    //
    //     const removedSanitized = copySanitized.map(
    //         ({ [thirdDependent]: _, ...rest }) => rest
    //     );
    //
    //     return [removedSanitized, additionalTable];
    // }

    function isProperSet(setA: Set<string>, setB: Set<string>){
        if (setA.size < setB.size){
            for (const A of setA) {
                if (!setB.has(A)){
                    return false;
                }
            }
        }
        else{
            return false;
        }
        return true;
    }


    function normalize2NF (fds_rewritten: Map<string, string[]>, primaryKey: Set<string>) {
        const fdViolators : string[][] = [];
        for (const [lhs, rhs] of fds_rewritten) {
            const X = new Set(lhs.split(",").filter(x => x.length > 0)); // lhs
            if (isProperSet(X, primaryKey)) {
                for (const attr of rhs) {
                    if (!primaryKey.has(attr)) {
                        fdViolators.push([lhs, attr])
                    }
                }
            }
        }
        return fdViolators;
    }
    function decomposeMultiple(fds: string[][], ogTable: Set<string>){
        // When a partial key is found, the workaround to normalizing the table is to move the dependent RHS and the
        // determinate LHS into their own table,
        // where the determinate becomes the primary key of that table.
        // In addition, we move the dependent attribute out of the original table.
        const copyOG = new Set(ogTable);
        const newTables : string[][] = []
        for (const dependency of fds){
            // need to check if the rhs is even in the og
            if (copyOG.has(dependency[1])){
                newTables.push([dependency[0], dependency[1]]);
                copyOG.delete(dependency[1]);
            }
        }


        return {
            newTables,
            reducedOG: copyOG
        }
    }

    // function populateNormalizedTables(sanitizedData: any[], decompositions: { newTable: string[][], reducedOG: Set<string> }[]) {
    //
    //     const populatedTables: any[][] = [];
    //
    //     for (const decomp of decompositions) {
    //         const { newTable } = decomp;
    //         const tableAttributes = newTable.flat();
    //         const populatedTable : any[] = [];
    //         for (const row of sanitizedData){
    //             const newRow : any= {};
    //             for (const attr of tableAttributes){
    //                 newRow[attr] = row[attr];
    //             }
    //             populatedTable.push(newRow);
    //         }
    //
    //         populatedTables.push(populatedTable);
    //
    //     }
    //
    //     for (const decomp of decompositions) {
    //         const { reducedOG } = decomp;
    //         const tableAttributes = Array.from(reducedOG);
    //         const populatedTable : any[] = [];
    //         for (const row of sanitizedData){
    //             const newRow : any= {};
    //             for (const attr of tableAttributes){
    //                 newRow[attr] = row[attr];
    //             }
    //             populatedTable.push(newRow);
    //         }
    //
    //         populatedTables.push(populatedTable);
    //     }
    //
    //
    //
    //     return populatedTables;
    // }

    function rowExists(arr: any[], newRow: any): boolean {
        const newRowStr = JSON.stringify(newRow);
        return arr.some(obj => JSON.stringify(obj) === newRowStr);
    }

    function populateNormalizedTables2(sanitizedData: any[], decompositions: { newTable: string[][], reducedOG: Set<string> }[]) {

        const populatedTables: any[][] = [];
        console.log("newtable", decompositions)
        for (const decomp of decompositions) {
            console.log("DECOMP", decomp)
            const { newTable } = decomp;
            for (const table of newTable){
                console.log("before flat", table)
                const tableAttributes = table.flat();
                console.log("after flat", tableAttributes);
                const populatedTable : any[] = [];
                for (const row of sanitizedData){
                    console.log("row", row)
                    const newRow : any= {};
                    for (const attr of tableAttributes){
                        if (attr.includes(",")) {
                            const attrSplit = attr.split(",");
                            for (const miniAttr of attrSplit) {
                                newRow[miniAttr] = row[miniAttr];
                            }
                        } else {
                            newRow[attr] = row[attr];
                        }
                        console.log("newrow", newRow)
                    }


                    if (!rowExists(populatedTable, newRow)){
                        populatedTable.push(newRow);
                    }

                }
                console.log("POPULATED!", populatedTable)
                populatedTables.push(populatedTable);
            }

        }

        for (const decomp of decompositions) {
            const { reducedOG } = decomp;
            const tableAttributes = Array.from(reducedOG);
            const populatedTable : any[] = [];
            for (const row of sanitizedData){
                const newRow : any= {};
                for (const attr of tableAttributes){
                    newRow[attr] = row[attr];
                }
                console.log("POPULATED2!", populatedTable)
                populatedTable.push(newRow);
            }

            populatedTables.push(populatedTable);
        }



        return populatedTables;
    }



    // remove mirrored duplicates for decomposition only
    function filterMirroredDeps(transitiveDeps: string[][]): string[][] {
        const seen = new Set<string>();
        const filtered: string[][] = [];

        for (const [lhs, rhs] of transitiveDeps) {
            const key1 = `${lhs}->${rhs}`;
            const key2 = `${rhs}->${lhs}`;

            // if we've already seen the reverse, skip this one
            if (!seen.has(key1) && !seen.has(key2)) {
                filtered.push([lhs, rhs]);
                seen.add(key1);
            }
        }

        return filtered;
    }

    function downloadCSV(table: any[], filename: string) {
        if (!table.length) return;
        const keys = Object.keys(table[0]);
        const header = keys.join(",");

        const rows = table.map(row => {
            return keys.map(k => `"${row[k]}"`).join(",");
        });

        const csv = [header, ...rows].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
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

            setPK("");
            setPartialDependencies([]);
            setListTransitiveDependencies([]);
            setTransitiveDependencies([]);
            setListPartialDependencies([]);


            const sanitizedData = sanitizeColumns(data);
            setData(sanitizedData);
            console.log("sanitized data,", sanitizedData)
            if (!sanitizedData || sanitizedData.length === 0) return;

            // attribute names as a Set<string>
            const attributeNames = new Set<string>(Object.keys(sanitizedData[0]));
            setAttrNames(attributeNames)
            const { partitionsByLevel, rhsPlusMap, superKeys } = generatePartitionsByLevel(attributeNames, sanitizedData);




            // now discover FDs using the filled partitions + rhsPlusMap
            const fds = discoverFDs(attributeNames, rhsPlusMap, partitionsByLevel, sanitizedData.length);

            console.log("Sanitized data:", sanitizedData);
            console.log("Partitions by level:", partitionsByLevel);
            console.log("RHS+ map:", rhsPlusMap);
            console.log("Discovered FDs:", fds);
            const fds_rewritten = rewriteFDs(fds);
            setFdsRewritten(fds_rewritten);

            console.log("FDs Rewritten:", fds_rewritten);


            const candidateKeys = getCandidateKeys(fds_rewritten, attributeNames.size);
            console.log("Candidate Keys:", candidateKeys);
            setCandidateKeys(Array.from(candidateKeys));

            // now i want minimal keys.
            const minimalKeys = getMinimalKeys(candidateKeys);
            setMinimalKeys(Array.from(minimalKeys));

            console.log("Minimal Keys", minimalKeys);

            const primaryKey = Array.from(minimalKeys)[0];

            setPK(Array.from(minimalKeys)[0]);

            const primaryKeySet = new Set(primaryKey.split(","));
            console.log("primary key set", primaryKeySet)
            if (primaryKeySet.size > 1){
                const fdViolators2NF = normalize2NF(fds_rewritten, primaryKeySet);
                console.log("Partial Dependencies (2NF Violators):", fdViolators2NF);
                setPartialDependencies(fdViolators2NF);
                setListPartialDependencies(fdViolators2NF);

                const { newTables: tablesFrom2NF, reducedOG: tableAfter2NF } = decomposeMultiple(fdViolators2NF, attributeNames);
                console.log("Tables from 2NF decomposition:", tablesFrom2NF);
                console.log("Reduced original table after 2NF:", Array.from(tableAfter2NF));

                const allTransitiveDeps: any[] = [];
                const allCandidateKeys: any[] = [];
                for (const tableAttrs of tablesFrom2NF) {
                    const localData = sanitizedData.map(row => {
                        const subRow: any = {};
                        tableAttrs.forEach(attr => { subRow[attr] = row[attr]; });
                        return subRow;
                    });

                    const localAttrSet = new Set<string>(tableAttrs);
                    const { partitionsByLevel, rhsPlusMap, superKeys } = generatePartitionsByLevel(localAttrSet, localData);

                    const localFDs = discoverFDs(localAttrSet, rhsPlusMap, partitionsByLevel, localData.length);
                    const localFDsRewritten = rewriteFDs(localFDs);

                    const localCandidateKeys = getCandidateKeys(localFDsRewritten, localAttrSet.size);
                    const localMinimalKeys = getMinimalKeys(localCandidateKeys);
                    const localPK = Array.from(localMinimalKeys)[0];

                    const localTransitiveDeps = getTransitiveDependencies(localFDsRewritten, new Set(localCandidateKeys), localPK);
                    console.log(`Transitive Dependencies in table [${tableAttrs.join(", ")}]:`, localTransitiveDeps);

                    allCandidateKeys.push(...localCandidateKeys);
                    allTransitiveDeps.push(...localTransitiveDeps);
                }


                // const candidateKeysSet = new Set(candidateKeys);
                // const transitiveDeps = getTransitiveDependencies(fds_rewritten, candidateKeysSet, primaryKey);
                // console.log("Transitive Dependencies (3NF Violators):", transitiveDeps);
                setListTransitiveDependencies(allTransitiveDeps)
                console.log("is it not listing", listTransitiveDependencies)
                setTransitiveDependencies(allTransitiveDeps)
                setCandidateKeys(allCandidateKeys)

                const { newTables: tablesFrom3NF, reducedOG: tableAfter3NF } = decomposeMultiple(allTransitiveDeps, tableAfter2NF);
                console.log("Tables from 3NF decomposition:", tablesFrom3NF);
                console.log("Reduced table after 3NF:", Array.from(tableAfter3NF));
                setTablesFrom3NF(tablesFrom3NF);

                setAfter3NF(tableAfter3NF);

                const normalizedTables: string[][] = [
                    Array.from(tableAfter3NF),
                    ...tablesFrom2NF,
                    ...tablesFrom3NF
                ];
                setNormalizedTables(normalizedTables);
                console.log("All normalized tables:", normalizedTables);

                const decompositions = [
                    { newTable: tablesFrom2NF, reducedOG: tableAfter2NF },
                ];

                const populated = populateNormalizedTables2(sanitizedData, decompositions);
                console.log("Populated normalized tables:", populated);
                setSplitDatasetResult(populated)
            }
            else {


                const candidateKeysSet = new Set(candidateKeys);
                const transitiveDeps = getTransitiveDependencies(fds_rewritten, candidateKeysSet, primaryKey);
                console.log("Transitive Dependencies (3NF Violators):", transitiveDeps);
                setTransitiveDependencies(transitiveDeps)
                setListTransitiveDependencies(transitiveDeps)

                const filteredTransitiveDeps = filterMirroredDeps(transitiveDeps);
                console.log("Filtered", filteredTransitiveDeps)
                const { newTables: tablesFrom3NF, reducedOG: tableAfter3NF } = decomposeMultiple(filteredTransitiveDeps, attributeNames);
                console.log("Tables from 3NF decomposition:", tablesFrom3NF);
                console.log("Reduced table after 3NF:", Array.from(tableAfter3NF));

                const normalizedTables: string[][] = [
                    Array.from(tableAfter3NF),
                    ...tablesFrom3NF
                ];
                console.log("All normalized tables:", normalizedTables);

                const decompositions = [
                    { newTable: tablesFrom3NF, reducedOG: tableAfter3NF }
                ];

                const populated = populateNormalizedTables2(sanitizedData, decompositions);
                console.log("Populated normalized tables:", populated);
                setSplitDatasetResult(populated)

                // const transitiveDeps = getTransitiveDependencies(fds_rewritten, candidateKeysSet, primaryKey);
                // console.log("Transitive Dependencies (3NF Violators):", transitiveDeps);
                //
                // const filteredTransitiveDeps = filterMirroredDeps(transitiveDeps);
                //
                // const { newTables: tablesFrom3NF, reducedOG: tableAfter3NF } = decomposeMultiple(filteredTransitiveDeps, tableAfter2NF);

            }



        };


        reader.readAsText(file);
    };




    return (
        <>

            <Header />
            <header className="text-center text-4xl mt-8 font-bold">
                Normalization
            </header>


            {/* file input */}
            <div id="input-container" className={"bg-[#e7e7e7] p-4 mx-20 rounded-md border-[2px] border-[#BD0A0A] mt-10 flex items-center"} >

                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="chat-input bg-gray-100 flex-grow mr-4 "
                    style={{ fontSize: "2vh" }}
                />
                {splitDatasetResult.length > 0 ?
                    <button className="cursor-pointer clear-btn bg-[#BD0A0A] hover:bg-[#700606] text-white mx-4" onClick={() => {
                        splitDatasetResult.forEach((tbl, idx) => downloadCSV(tbl, `table${idx + 1}.csv`));
                    }}>
                        Download Normalized Dataset
                    </button>
                    : <div></div>
                }

            </div>
            <div>
                {data.length > 0 ? (
                    <div className="text-left mx-20 my-5">
                        <div className="flex flex-row gap-2">
                            <div className="font-bold">Primary Key(s) Found:</div>
                            <div>
                                {pk}
                            </div>
                        </div>

                        <div className="">
                            <div className="font-bold">Partial Dependencies Found:</div>
                            <div className={"ml-10"}>
                                {listPartialDependencies.length === 0 ? <li>None</li> :
                                    <li>
                                        {listPartialDependencies.map((item, index) => {
                                            const display = Array.isArray(item) ? `${item[0]} → ${item[1]}` : "None";
                                            return <li key={index}>{display}</li>;
                                        })}
                                    </li>
                                }
                            </div>
                        </div>

                        <div className="">
                            <div className="font-bold">Transitive Dependencies Found:</div>
                            <div className={"ml-10"}>
                                {listTransitiveDependencies.length === 0 ? <li>None</li> :
                                    <li>
                                        {listTransitiveDependencies.map((item, index) => {
                                            const display = Array.isArray(item) ? `${item[0]} → ${item[1]}` : String(item);
                                            return <li key={index}>{display}</li>;
                                        })}
                                    </li>
                                }
                            </div>
                        </div>

                    </div>
                ) : (
                    <div>
                    </div>
                )}
            </div>


            {popUp ? (
                <div
                    className="fixed inset-0  bg-gray-400/50 flex justify-center items-center z-50 p-4">

                    <div className={"w-2/5 bg-[#F0F0F0] rounded-lg border-3 border-[#B3B3B3]"}>
                        <div className={"flex justify-end"}>
                            <button
                                onClick={() => setPopUp(false)}
                                className="cursor-pointer text-lg text-gray-600 hover:text-gray-900 p-4 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className={"flex justify-start"}>
                            <h2 className={"ml-6 mb-2 font-bold text-3xl text-[#353535]"}>Edit Dataset </h2>
                        </div>
                        <div className="flex justify-start font-bold text-[#353535] ml-6 mt-2 text-lg">
                            Candidate Key(s) Found:
                        </div>
                        <div className="flex justify-start">
                            <div>
                                <ul className="flex flex-wrap ml-8 mt-3">
                                    {minimalKeys.map((item, index) => (
                                        <li
                                            key={index}
                                            className="flex basis-1/3 mb-2"
                                        >
                                            <input
                                                type="radio"
                                                name="candidateKey"
                                                className="w-4 h-4"
                                                checked={
                                                     item === pk
                                                }
                                                onChange={() => {
                                                    if (item.includes(",")) {
                                                        setPK(item);
                                                        console.log("compositive key", pk)
                                                        const fdViolators2NF = normalize2NF(fdsRewritten, new Set(pk.split(",")));
                                                        console.log("Partial Dependencies (2NF Violators):", fdViolators2NF);
                                                        setPartialDependencies(fdViolators2NF);
                                                        setListPartialDependencies(fdViolators2NF);
                                                        // console.log("attr names, ", attrNames)

                                                        const {
                                                            newTables: tablesFrom2NF,
                                                            reducedOG: tableAfter2NF
                                                        } = decomposeMultiple(fdViolators2NF, attrNames);
                                                        console.log("Tables from 2NF decomposition:", tablesFrom2NF);
                                                        console.log("Reduced original table after 2NF:", Array.from(tableAfter2NF));

                                                        const allTransitiveDeps: any[] = [];
                                                        const allCandidateKeys: any[] = [];
                                                        for (const tableAttrs of tablesFrom2NF) {
                                                            const localData = data.map(row => {
                                                                const subRow: any = {};
                                                                tableAttrs.forEach(attr => {
                                                                    subRow[attr] = row[attr];
                                                                });
                                                                return subRow;
                                                            });

                                                            const localAttrSet = new Set<string>(tableAttrs);
                                                            const {
                                                                partitionsByLevel,
                                                                rhsPlusMap,
                                                                superKeys
                                                            } = generatePartitionsByLevel(localAttrSet, localData);

                                                            const localFDs = discoverFDs(localAttrSet, rhsPlusMap, partitionsByLevel, localData.length);
                                                            const localFDsRewritten = rewriteFDs(localFDs);

                                                            const localCandidateKeys = getCandidateKeys(localFDsRewritten, localAttrSet.size);
                                                            const localMinimalKeys = getMinimalKeys(localCandidateKeys);
                                                            const localPK = Array.from(localMinimalKeys)[0];

                                                            const localTransitiveDeps = getTransitiveDependencies(localFDsRewritten, new Set(localCandidateKeys), localPK);
                                                            console.log(`Transitive Dependencies in table [${tableAttrs.join(", ")}]:`, localTransitiveDeps);

                                                            allCandidateKeys.push(...localCandidateKeys);
                                                            allTransitiveDeps.push(...localTransitiveDeps);
                                                        }


                                                        // const candidateKeysSet = new Set(candidateKeys);
                                                        // const transitiveDeps = getTransitiveDependencies(fds_rewritten, candidateKeysSet, primaryKey);
                                                        // console.log("Transitive Dependencies (3NF Violators):", transitiveDeps);
                                                        setListTransitiveDependencies(allTransitiveDeps)
                                                        console.log("is it not listing", listTransitiveDependencies)
                                                        setTransitiveDependencies(allTransitiveDeps)
                                                        setCandidateKeys(allCandidateKeys)

                                                        const {
                                                            newTables: tablesFrom3NF,
                                                            reducedOG: tableAfter3NF
                                                        } = decomposeMultiple(allTransitiveDeps, tableAfter2NF);
                                                        console.log("Tables from 3NF decomposition:", tablesFrom3NF);
                                                        console.log("Reduced table after 3NF:", Array.from(tableAfter3NF));
                                                        setTablesFrom3NF(tablesFrom3NF);

                                                        setAfter3NF(tableAfter3NF);

                                                        const normalizedTables: string[][] = [
                                                            Array.from(tableAfter3NF),
                                                            ...tablesFrom2NF,
                                                            ...tablesFrom3NF
                                                        ];
                                                        setNormalizedTables(normalizedTables);
                                                        console.log("All normalized tables:", normalizedTables);

                                                        const decompositions = [
                                                            {newTable: tablesFrom2NF, reducedOG: tableAfter2NF},
                                                        ];

                                                        const populated = populateNormalizedTables2(data, decompositions);
                                                        console.log("Populated normalized tables:", populated);
                                                    }
                                                    else{
                                                        setPK(item)
                                                    };
                                                }}
                                            />
                                            <span className="ml-2 mr-4 relative -top-1">{item}</span>
                                        </li>
                                    ))}
                                </ul>

                            </div>
                        </div>

                        <div className="flex justify-start font-bold text-[#353535] ml-6 mt-2 text-lg">
                            Partial Dependencies Found:
                        </div>
                        <div className="flex justify-start">
                            <div>
                                <ul className="ml-8 mt-2 space-y-2">
                                    {listPartialDependencies.length === 0 ? <li>None</li> :
                                        <div className={"overflow-auto-scroll h-32"}>
                                            {listPartialDependencies.map((item, index) => {
                                                const display = Array.isArray(item) ? `${item[0]} → ${item[1]}` : String(item);
                                                return (
                                                    <li key={index} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4"
                                                            checked={(partialDependencies.some(dep => dep.join(",") === item.join(",")))}
                                                            onChange={(e) => {
                                                                let updatedDeps: string[][];

                                                                console.log("before check deps", partialDependencies)

                                                                if (e.target.checked) {
                                                                    // add to list
                                                                    updatedDeps = [...partialDependencies, item];
                                                                    console.log("updated deps add", updatedDeps)
                                                                } else {
                                                                    // remove from list
                                                                    updatedDeps = partialDependencies.filter(
                                                                        dep => dep.join(",") !== item.join(",")
                                                                    );
                                                                    console.log("updated deps remove", updatedDeps)
                                                                }

                                                                setPartialDependencies(updatedDeps)

                                                                const { newTables: tablesFrom2NF, reducedOG: tableAfter2NF } = decomposeMultiple(updatedDeps, attrNames);
                                                                console.log("Tables from 2NF decomposition:", tablesFrom2NF);
                                                                console.log("Reduced original table after 2NF:", Array.from(tableAfter2NF));

                                                                const allTransitiveDeps: any[] = [];
                                                                const allCandidateKeys: any[] = [];
                                                                for (const tableAttrs of tablesFrom2NF) {
                                                                    const localData = data.map(row => {
                                                                        const subRow: any = {};
                                                                        tableAttrs.forEach(attr => { subRow[attr] = row[attr]; });
                                                                        return subRow;
                                                                    });

                                                                    const localAttrSet = new Set<string>(tableAttrs);
                                                                    const { partitionsByLevel, rhsPlusMap, superKeys } = generatePartitionsByLevel(localAttrSet, localData);

                                                                    const localFDs = discoverFDs(localAttrSet, rhsPlusMap, partitionsByLevel, localData.length);
                                                                    const localFDsRewritten = rewriteFDs(localFDs);

                                                                    const localCandidateKeys = getCandidateKeys(localFDsRewritten, localAttrSet.size);
                                                                    const localMinimalKeys = getMinimalKeys(localCandidateKeys);
                                                                    const localPK = Array.from(localMinimalKeys)[0];

                                                                    const localTransitiveDeps = getTransitiveDependencies(localFDsRewritten, new Set(localCandidateKeys), localPK);
                                                                    console.log(`Transitive Dependencies in table [${tableAttrs.join(", ")}]:`, localTransitiveDeps);

                                                                    allCandidateKeys.push(...localCandidateKeys);
                                                                    allTransitiveDeps.push(...localTransitiveDeps);
                                                                }


                                                                // const candidateKeysSet = new Set(candidateKeys);
                                                                // const transitiveDeps = getTransitiveDependencies(fds_rewritten, candidateKeysSet, primaryKey);
                                                                // console.log("Transitive Dependencies (3NF Violators):", transitiveDeps);
                                                                setListTransitiveDependencies(allTransitiveDeps)
                                                                console.log("is it not listing", listTransitiveDependencies)
                                                                setTransitiveDependencies(allTransitiveDeps)
                                                                setCandidateKeys(allCandidateKeys)

                                                                const { newTables: tablesFrom3NF, reducedOG: tableAfter3NF } = decomposeMultiple(allTransitiveDeps, tableAfter2NF);
                                                                console.log("Tables from 3NF decomposition:", tablesFrom3NF);
                                                                console.log("Reduced table after 3NF:", Array.from(tableAfter3NF));
                                                                setTablesFrom3NF(tablesFrom3NF);

                                                                setAfter3NF(tableAfter3NF);

                                                                const normalizedTables: string[][] = [
                                                                    Array.from(tableAfter3NF),
                                                                    ...tablesFrom2NF,
                                                                    ...tablesFrom3NF
                                                                ];
                                                                setNormalizedTables(normalizedTables);
                                                                console.log("All normalized tables:", normalizedTables);

                                                                const decompositions = [
                                                                    { newTable: tablesFrom2NF, reducedOG: tableAfter2NF },
                                                                ];

                                                                const populated = populateNormalizedTables2(data, decompositions);
                                                                console.log("Populated normalized tables:", populated);
                                                                setSplitDatasetResult(populated)

                                                            }}
                                                        />
                                                        <span className="ml-2">{display}</span>
                                                    </li>
                                                );
                                            })}
                                        </div>}
                                </ul>
                            </div>
                        </div>


                        <div className="flex justify-start font-bold text-[#353535] ml-6 mt-2 text-lg">
                            Transitive Dependencies Found:
                        </div>
                        <div className="flex justify-start">
                            <div>
                                <ul className="ml-8 mt-2 space-y-2">
                                    {listTransitiveDependencies.length === 0 ? <li>None</li> :
                                        <div className={"overflow-auto-scroll h-32 mb-4"}>
                                            {listTransitiveDependencies.map((item, index) => {
                                                const display = Array.isArray(item) ? `${item[0]} → ${item[1]}` : String(item);
                                                return (
                                                    <li key={index} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4"
                                                            checked={(transitiveDependencies.some(dep => dep.join(",") === item.join(",")))}
                                                            onChange={(e) => {
                                                                let updatedDeps: string[][];

                                                                console.log("before check deps", transitiveDependencies)

                                                                if (e.target.checked) {
                                                                    updatedDeps = [...transitiveDependencies, item];
                                                                    console.log("updated deps add", updatedDeps)
                                                                } else {
                                                                    updatedDeps = transitiveDependencies.filter(
                                                                        dep => dep.join(",") !== item.join(",")
                                                                    );
                                                                    console.log("updated deps remove", updatedDeps)
                                                                }

                                                                setTransitiveDependencies(updatedDeps);
                                                                console.log("after check deps", transitiveDependencies)

                                                                const filteredTransitiveDeps = filterMirroredDeps(updatedDeps);
                                                                console.log("Filtered", filteredTransitiveDeps);
                                                                console.log("attr names", attrNames)
                                                                const { newTables: tablesFrom3NF, reducedOG: tableAfter3NF } = decomposeMultiple(filteredTransitiveDeps, attrNames);
                                                                console.log("Tables from 3NF decomposition:", tablesFrom3NF);
                                                                console.log("Reduced table after 3NF:", Array.from(tableAfter3NF));

                                                                const normalizedTables: string[][] = [
                                                                    Array.from(tableAfter3NF),
                                                                    ...tablesFrom3NF
                                                                ];
                                                                console.log("All normalized tables:", normalizedTables);

                                                                const decompositions = [
                                                                    { newTable: tablesFrom3NF, reducedOG: tableAfter3NF }
                                                                ];

                                                                const populated = populateNormalizedTables2(data, decompositions);
                                                                console.log("Populated normalized tables:", populated);
                                                                setSplitDatasetResult(populated)
                                                            }}
                                                        />
                                                        <span className="ml-2">{display}</span>
                                                    </li>
                                                );
                                            })}
                                        </div>}
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            ) : (<div></div>)}



            {/*test of the ages...*/}
            <div className="mx-20 overflow-x-auto">
                {data.length > 0 ? (
                    <div>
                        <h2 className="text-xl mt-2 font-bold">Normalized Dataset</h2>
                        <div className="bg-[#D9D9D9] p-5 rounded-md border border-[#6B6B6B] h-150">
                            <div className="flex flex-row gap-6 h-full overflow-x-auto">
                                {splitDatasetResult.map((tableData, tableIndex) => (
                                    <div
                                        key={tableIndex}
                                        className="flex-1 overflow-auto border border-[#6B6B6B] rounded-md min-w-[400px] h-full"
                                    >
                                        <table className="w-full table-fixed border-collapse h-full">
                                            <thead className="bg-[#C7C7C7] sticky top-0 z-10 border-b border-[#6B6B6B]">
                                            <tr>
                                                {Object.keys(tableData[0] ?? {}).map((key) => (
                                                    <th
                                                        key={key}
                                                        className="px-4 py-2 text-left border-r border-[#6B6B6B]"
                                                    >
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                            </thead>
                                            <tbody className="h-full">
                                            {tableData.map((row, rowIndex) => (
                                                <tr
                                                    key={rowIndex}
                                                    className="bg-[#C7C7C7]"
                                                    style={{
                                                        height: `${100 / Math.max(tableData.length, 1)}%`,
                                                    }}
                                                >
                                                    {Object.keys(row).map((key) => (
                                                        <td
                                                            key={key}
                                                            className="border px-4 py-2 border-[#6B6B6B] truncate"
                                                        >
                                                            {row[key]?.toString() ?? ""}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </div>



                        <div className={"flex justify-end font-bold"}>
                            <button className={"text-[#BD0A0A] hover:underline w-1/3"}
                                    onClick={() => setPopUp(true)}>
                                Data not normalized correctly?
                            </button>
                        </div>

                    </div>

                ) : (
                    <div className={"bg-[#D9D9D9] rounded-md text-center  h-100 border border-[#6B6B6B] mt-10"}>
                        <p className="text-center mt-4">Upload a CSV file to see results</p>
                    </div>

                )}

            </div>

            {/* show parsed CSV as a table */}
            <div className="mx-20 overflow-x-auto">
                {data.length > 0 ? (
                    <div>
                        <h2 className="text-xl mt-2 font-bold">Original Dataset</h2>
                        <div className="bg-[#D9D9D9] p-5 rounded-md h-150">
                            <div className="table-container bg-[#D9D9D9] rounded-md text-center overflow-auto h-full border border-[#6B6B6B]">
                                <table className="w-full table-fixed border-collapse h-full">
                                    <thead className="bg-[#C7C7C7] sticky top-0 z-10 border-b border-[#6B6B6B]">
                                    <tr>
                                        {Object.keys(data[0]).map((key) => (
                                            <th key={key} className="px-4 py-2 text-left border-r border-[#6B6B6B]">
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                    </thead>

                                    <tbody className="h-full">
                                    {data.map((row, rowIndex) => (
                                        <tr
                                            key={rowIndex}
                                            className="bg-[#C7C7C7]"
                                            style={{ height: `${100 / Math.max(data.length, 1)}%` }}
                                        >
                                            {Object.keys(row).map((key) => (
                                                <td key={key} className="border px-4 py-2 border-[#6B6B6B] truncate">
                                                    {row[key]?.toString() ?? ""}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>


                    </div>

                ) : (
                    <div></div>
                )}

            </div>




            <Footer />
        </>
    );
};

export default Normalization;
