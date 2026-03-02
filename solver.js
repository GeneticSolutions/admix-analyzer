// Core Admixture Solver Math
// Extracted from original Vahaduo Admixture JS
// Do not modify the math logic below to ensure correctness.

function randomFromRange(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function subArray(arr1, arr2) {
    const subtracted = arr1.map(function (elmnt, index) {
        return elmnt - arr2[index];
    });
    return subtracted;
}

function addArray(arr1, arr2) {
    const added = arr1.map(function (elmnt, index) {
        return elmnt + arr2[index];
    });
    return added;
}

function getArraySum(arr) {
    function arrSum(total, num) {
        return total + num;
    }
    return arr.reduce(arrSum);
}

function squareArray(arr) {
    const squared = arr.map(function (elmnt) {
        return elmnt * elmnt;
    });
    return squared;
}

function prepareTarget(targetArray, targetId, slots, dimensions) {
    let i;
    const target = targetArray[targetId].slice();
    target.shift();
    for (i = 0; i < dimensions; i++) {
        target[i] = target[i] / slots;
    }
    return target;
}

function prepareSource(sourceArray, sourceNum, slots, dimensions) {
    let i, j, tempLine;
    const source = Array(sourceNum);
    for (i = 0; i < sourceNum; i++) {
        tempLine = sourceArray[i].slice();
        tempLine.shift();
        source[i] = tempLine.slice();
        for (j = 0; j < dimensions; j++) {
            source[i][j] = source[i][j] / slots;
        }
    }
    return source;
}

function nPops(targetArray, sourceArray, targetId, slots, cyclesMultiplier, distColMultiplier, recalculate, nPop, dimensions, sourceNum) {
    // For simplicity, we are going to wrap nPop calling logic inside an interface, 
    // but here we must provide the original nPop with the dependencies it needs passed in.

    const target = prepareTarget(targetArray, targetId, slots, dimensions);
    let source = prepareSource(sourceArray, sourceNum, slots, dimensions);

    let namesArr = [], idArr = [], initSet = [], initResult, initResultsTable = [], counter = 0, sloths = slots,
        popNum, currentSet = [], currentResult, nextSet, nextResult, newSource = [], newNamesArr = [];

    function aggregateArray(arr) {
        let sortedArr = arr.slice(), aggregatedArr = [];
        sortedArr.sort(function (a, b) {
            return a[0].localeCompare(b[0]);
        });
        for (let name = null, i = 0, j = -1, n = sortedArr.length; i < n; i++) {
            if (sortedArr[i][0] != name) {
                j++;
                name = sortedArr[i][0];
                aggregatedArr.push([]);
            }
            aggregatedArr[j].push(sortedArr[i]);
        }
        return aggregatedArr;
    }

    // Aggregate helper for results inside nPops
    function aggregateResultsInside(resultsTable, sourceNumLocal) {
        let i, popName, storedName;
        for (i = 0; i < sourceNumLocal; i++) {
            popName = resultsTable[i][0].split(":");
            resultsTable[i][0] = popName[0];
        }
        resultsTable.sort(function (a, b) {
            return a[0].localeCompare(b[0]);
        });
        for (i = sourceNumLocal - 2; i > -1; i--) {
            if (resultsTable[i][0] == resultsTable[i + 1][0]) {
                storedName = resultsTable[i][0];
                resultsTable[i] = addArray(resultsTable[i], resultsTable[i + 1]);
                resultsTable[i][0] = storedName;
                resultsTable.splice(i + 1, 1);
            }
        }
        return resultsTable;
    }

    function runFMC(setToRun) {
        counter++;
        let currentSource = [];
        for (let item of setToRun) {
            currentSource = currentSource.concat(source[item]);
        }
        return fastMonteCarlo(target, currentSource, targetId, slots, cyclesMultiplier, distColMultiplier, recalculate, currentSource.length, dimensions);
    }

    function runFMCadc(setToRun, slots, adc, adcmltp, cmltp) {
        let currentSource = [];
        for (let item of setToRun) {
            currentSource = currentSource.concat(source[item]);
        }
        return fastMonteCarlo(target, currentSource, targetId, slots, cmltp, adcmltp, adc, currentSource.length, dimensions);
    }

    function getNames(setToRun) {
        let names = [];
        for (let item of setToRun) {
            names = names.concat(namesArr[item]);
        }
        return names;
    }

    function newPop(currentSetItem) {
        let newPopVal = randomFromRange(0, popNum);
        while (newPopVal == currentSetItem || currentSet.includes(newPopVal)) {
            newPopVal = randomFromRange(0, popNum);
        }
        return newPopVal;
    }

    for (let i = 0, tempArr; i < sourceNum; i++) {
        tempArr = [sourceArray[i][0].split(':').shift(), sourceArray[i][0]];
        source[i] = tempArr.concat(source[i]);
    }
    source = aggregateArray(source);
    for (let item in source) {
        namesArr.push([]);
        for (let item2 in source[item]) {
            source[item][item2].shift();
            namesArr[item].push(source[item][item2].shift());
            idArr.push(item);
        }
    }
    popNum = source.length;
    for (let i = 0; i < popNum; i++) {
        initSet.push(i);
    }
    let slotNum = 50, cyclesNum = 5;
    initResult = [
        runFMCadc(initSet, slotNum, true, 0.5, cyclesNum),
        runFMCadc(initSet, slotNum, false, 0, cyclesNum),
        runFMCadc(initSet, slotNum, true, 1, cyclesNum),
        runFMCadc(initSet, slotNum, false, 0, cyclesNum),
        runFMCadc(initSet, slotNum, true, 2, cyclesNum),
        runFMCadc(initSet, 500, false, 0, 2)
    ];
    for (let item in idArr) {
        for (let item2 in initResult) {
            initResultsTable.push([idArr[item], initResult[item2].scores[item]]);
        }
    }
    initResultsTable = aggregateResultsInside(initResultsTable, initResultsTable.length);
    initResultsTable.sort(function (a, b) {
        return b[1] - a[1];
    });
    for (let item in initResultsTable) {
        if (Number(initResultsTable[item][1]) > 0.02) {
            newSource.push(source[Number(initResultsTable[item][0])]);
            newNamesArr.push(namesArr[Number(initResultsTable[item][0])]);
        } else {
            break;
        }
    }
    source = newSource;
    namesArr = newNamesArr;
    popNum = source.length;
    if (popNum <= nPop) {
        for (let i = 0; i < popNum; i++) {
            currentSet.push(i);
        }
        return finishIt();
    } else {
        for (let i = 0; i < nPop; i++) {
            currentSet.push(i);
        }
    }
    let storeSet = currentSet;
    let runs = [];
    for (let i = 0, n = 30 + popNum; i < n; i++) {
        currentSet = storeSet.slice();
        currentResult = runFMC(currentSet);
        slots = 35;
        for (let i = 0, n = Math.ceil(popNum); i < n; i++) {
            for (let j = 0; j < nPop; j++) {
                nextSet = currentSet.slice();
                nextSet[j] = newPop(nextSet[j]);
                nextResult = runFMC(nextSet);
                if (nextResult.distance < currentResult.distance) {
                    currentResult = nextResult;
                    currentSet = nextSet;
                }
            }
        }
        runs.push([currentResult.distance, currentSet.slice()]);
    }
    runs.sort(function (a, b) {
        return a[0] - b[0];
    });
    currentSet = runs[0][1];

    function finishIt() {
        slots = sloths;
        currentResult = runFMC(currentSet);
        currentResult.names = getNames(currentSet);
        currentResult.pops = popNum;
        currentResult.iter = counter;
        return currentResult;
    }
    return finishIt();
}

function fastMonteCarlo(target, source, targetId, slots, cyclesMultiplier, distColMultiplier, recalculate, sourceNum, dimensions) {
    let i, j, currentSlots, currentPoint, currentDistance, nextSlots, ranking = Array(),
        nextPoint, nextDistance, previousDistance, rankingNum, dimNum = dimensions;
    const cycles = Math.ceil(sourceNum * cyclesMultiplier / 4), scores = Array(sourceNum).fill(0),
        result = { target: targetId, distance: 0, scores },
        bigNumber = 100000000000000000;

    // operate on a copy of source to avoid mutating the original array passed in
    let sourceCopy = [];
    for (let i = 0; i < sourceNum; i++) {
        sourceCopy.push([...source[i]]);
    }

    if (distColMultiplier) {
        distColMultiplier /= 8;
        dimNum++;
        for (i = 0; i < sourceNum; i++) {
            sourceCopy[i] = subArray(sourceCopy[i], target);
            sourceCopy[i].push(distColMultiplier * Math.sqrt(distance(sourceCopy[i])));
        }
    }
    else {
        for (i = 0; i < sourceNum; i++) {
            sourceCopy[i] = subArray(sourceCopy[i], target);
        }
    }

    function randomizedSlots(oldSlots) {
        let i, newSlots = Array(slots);
        for (i = 0; i < slots; i++) {
            newSlots[i] = randomFromRange(0, sourceNum);
            while (newSlots[i] == oldSlots[i]) {
                newSlots[i] = randomFromRange(0, sourceNum);
            }
        }
        return newSlots;
    }

    function buildPoint(fromSlots) {
        let i, tempLine, newPoint = Array(dimNum).fill(0);
        for (i = 0; i < slots; i++) {
            tempLine = sourceCopy[fromSlots[i]].slice();
            newPoint = addArray(newPoint, tempLine);
        }
        return newPoint;
    }

    function distance(fromPoint) {
        let dist = squareArray(fromPoint);
        dist = getArraySum(dist);
        return dist;
    }

    if (sourceNum == 1) {
        currentSlots = Array(slots).fill(0);
        currentPoint = buildPoint(currentSlots);
        currentDistance = distance(currentPoint);
        scores[0] = 1;
        result.distance = Number(Math.sqrt(currentDistance).toFixed(8));
        result.scores = scores;
        return result;
    }
    currentSlots = Array(slots).fill(-1);
    currentSlots = randomizedSlots(currentSlots);
    currentPoint = buildPoint(currentSlots);
    currentDistance = distance(currentPoint);
    for (i = 0; i < cycles; i++) {
        nextSlots = randomizedSlots(currentSlots);
        for (j = 0; j < slots; j++) {
            nextPoint = subArray(currentPoint, sourceCopy[currentSlots[j]]);
            nextPoint = addArray(nextPoint, sourceCopy[nextSlots[j]]);
            nextDistance = distance(nextPoint);
            if (nextDistance < currentDistance) {
                currentSlots[j] = nextSlots[j];
                currentPoint = nextPoint;
                currentDistance = nextDistance;
            }
        }
    }
    for (i = 0; i < slots; i++) {
        scores[currentSlots[i]] += 1;
    }
    for (i = 0; i < sourceNum; i++) {
        if (scores[i] > 0) {
            ranking.push([i, scores[i]]);
        }
    }
    ranking.sort(function (a, b) {
        return b[1] - a[1];
    });
    rankingNum = ranking.length;
    function secondStage() {
        currentDistance = Math.round(bigNumber * currentDistance);
        do {
            previousDistance = currentDistance;
            for (i = rankingNum - 1; i > -1; i--) {
                if (ranking[i][1] > 0) {
                    for (j = 0; j < rankingNum; j++) {
                        if (i == j) { continue; }
                        nextPoint = subArray(currentPoint, sourceCopy[ranking[i][0]]);
                        nextPoint = addArray(nextPoint, sourceCopy[ranking[j][0]]);
                        nextDistance = Math.round(bigNumber * distance(nextPoint));
                        if (nextDistance < currentDistance) {
                            ranking[i][1]--;
                            ranking[j][1]++;
                            currentPoint = nextPoint;
                            currentDistance = nextDistance;
                            break;
                        }
                    }
                }
            }
        }
        while (currentDistance < previousDistance);
    }
    secondStage();
    for (i = 0; i < rankingNum; i++) {
        scores[ranking[i][0]] = ranking[i][1];
    }
    if (distColMultiplier && recalculate) {
        dimNum--;
        currentPoint.pop();
        currentDistance = distance(currentPoint);
        for (i = 0; i < sourceNum; i++) {
            sourceCopy[i].pop();
        }
        ranking = [];
        for (i = 0; i < sourceNum; i++) {
            if (scores[i] > 0) {
                ranking.push([i, scores[i]]);
            }
        }
        ranking.sort(function (a, b) {
            return b[1] - a[1];
        });
        rankingNum = ranking.length;
        secondStage();
        for (i = 0; i < rankingNum; i++) {
            scores[ranking[i][0]] = ranking[i][1];
        }
    }

    for (i = 0; i < sourceNum; i++) {
        scores[i] = scores[i] / slots;
    }
    if (distColMultiplier && !recalculate) { currentPoint.pop(); }
    currentDistance = distance(currentPoint);
    result.distance = Number(Math.sqrt(currentDistance).toFixed(8));
    result.scores = scores;
    return result;
}

// Wrapper to easily execute the single admixture process
// Maps the target string structure and returns formatted result tables.
function runAdmixtureCore(targetArray, sourceArray, targetId, useNPop = 0) {
    let i, currentResult, resultsTable, result;
    const slots = 500;
    const cyclesX = 1;
    const addDC = false; // addDistCol disabled for simple implementation
    const addDistColRecal = true;

    // We expect the first element to be the name, followed by dimensions
    const dimensions = sourceArray[0].length - 1;
    const sourceNum = sourceArray.length;

    if (useNPop === 0) {
        const target = prepareTarget(targetArray, targetId, slots, dimensions);
        const source = prepareSource(sourceArray, sourceNum, slots, dimensions);
        result = fastMonteCarlo(target, source, targetId, slots, cyclesX, addDC, addDistColRecal, sourceNum, dimensions);

        resultsTable = Array(sourceNum);
        for (i = 0; i < sourceNum; i++) {
            resultsTable[i] = Array(2);
            resultsTable[i][0] = sourceArray[i][0];
            resultsTable[i][1] = result.scores[i];
        }
    } else {
        result = nPops(targetArray, sourceArray, targetId, slots, cyclesX, addDC, addDistColRecal, useNPop, dimensions, sourceNum);
        const sourceNumLocal = result.scores.length;
        resultsTable = Array(sourceNumLocal);
        for (i = 0; i < sourceNumLocal; i++) {
            resultsTable[i] = Array(2);
            resultsTable[i][0] = result.names[i];
            resultsTable[i][1] = result.scores[i];
        }
    }

    // Aggregate results
    let aggregatedTable = aggregateResults(resultsTable, resultsTable.length);

    // Sort descending by score
    aggregatedTable.sort(function (a, b) {
        return b[1] - a[1];
    });

    // Filter out ~zeroes if wanted, here we return exactly what ran so the UI can format
    return {
        distance: result.distance,
        breakdown: aggregatedTable
    };
}

function aggregateResults(resultsTable, sourceNumLocal) {
    let i, popName, storedName;
    for (i = 0; i < sourceNumLocal; i++) {
        popName = resultsTable[i][0].split(":");
        resultsTable[i][0] = popName[0];
    }
    resultsTable.sort(function (a, b) {
        return a[0].localeCompare(b[0]);
    });
    for (i = sourceNumLocal - 2; i > -1; i--) {
        if (resultsTable[i][0] == resultsTable[i + 1][0]) {
            storedName = resultsTable[i][0];
            resultsTable[i] = addArray(resultsTable[i], resultsTable[i + 1]);
            resultsTable[i][0] = storedName;
            resultsTable.splice(i + 1, 1);
        }
    }
    return resultsTable;
}

// Export for module systems (not used in static browser if included via script tags, but good practice if bundled later)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAdmixtureCore,
        randomFromRange, subArray, addArray, getArraySum, squareArray
    };
}
