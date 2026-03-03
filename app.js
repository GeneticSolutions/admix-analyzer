// Main Application Logic
// Handles DOM interactions, parsing user input, and rendering the results

document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('runBtn');
    const targetInput = document.getElementById('targetInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const errorMsg = document.getElementById('errorMsg');

    // Dataset selection
    let currentSources = PREDEFINED_SOURCES;

    const POP_COLORS = {
        'Steppe': '#6ba4c6',
        'East_Asian': '#9b7eb5',
        'AASI': '#7db695',
        'Farmer': '#d1bb69',
        'BMAC': '#d07b5a'
    };

    runBtn.addEventListener('click', () => {
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
        resultsContainer.innerHTML = '';

        const rawTargetData = targetInput.value;
        const targetArray = parseTargetData(rawTargetData);
        if (!targetArray || targetArray.length === 0) return;

        const expectedDimensions = currentSources[0].length;
        // Basic validation: ensure at least the first target is the right length
        for (let i = 0; i < targetArray.length; i++) {
            if (targetArray[i].length !== expectedDimensions) {
                showError(`Column mismatch on line ${i + 1}. Expected ${expectedDimensions - 1} coordinates, found ${targetArray[i].length - 1}. Please provide full G25 coordinates.`);
                return;
            }
        }

        try {
            runBtn.textContent = 'Calculating...';
            runBtn.disabled = true;

            setTimeout(() => {

                // Track all populations found across all results to build table headers statically
                let allPopsSet = new Set();
                let allResults = [];

                // Run the solver for each target line
                for (let i = 0; i < targetArray.length; i++) {
                    const singleTargetArray = [targetArray[i]];
                    const result = runAdmixtureCore(singleTargetArray, currentSources, 0, 0);

                    allResults.push({
                        targetName: targetArray[i][0],
                        distance: result.distance,
                        breakdown: result.breakdown
                    });

                    // Add significant populations to the master list for headers
                    result.breakdown.forEach(item => {
                        if (item[1] > 0.0001) {
                            allPopsSet.add(item[0]);
                        }
                    });
                }

                // Convert the set to an array so we have fixed column headers
                const allPopsArray = Array.from(allPopsSet);

                // Simple sort order prioritizing major populations from the prompt
                const orderScore = {
                    'Farmer': 100,
                    'Steppe': 90,
                    'BMAC': 80,
                    'AASI': 70,
                    'East_Asian': 60
                };
                allPopsArray.sort((a, b) => (orderScore[b] || 0) - (orderScore[a] || 0));

                renderMultiResults(allResults, allPopsArray);

                runBtn.textContent = 'Run Admixture';
                runBtn.disabled = false;
            }, 50);

        } catch (err) {
            showError('An error occurred during calculation. Please check your data format.');
            console.error(err);
            runBtn.textContent = 'Run Admixture';
            runBtn.disabled = false;
        }
    });

    function parseTargetData(rawText) {
        if (!rawText || rawText.trim() === '') {
            showError("Please paste your G25 coordinates first.");
            return null;
        }

        let text1 = rawText.trim().replace(/\r\n/g, "\n").replace(/\"/g, "").replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
        let text2 = text1.replace(/[^\S\n]/g, "");
        let text3 = text2.replace(/\n+/g, "\n");
        let text4 = text3.replace(/\,+/g, "\,");

        const lines = text4.split("\n");
        let validLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].split(",");

            if (line.length <= 1) {
                // skip empty or single-word lines
                continue;
            }

            let hasError = false;
            for (let j = 1; j < line.length; j++) {
                if (isNaN(Number(line[j]))) {
                    showError(`Non-numerical value detected in coordinates on line ${i + 1}.`);
                    hasError = true;
                    break;
                }
                line[j] = Number(line[j]);
            }
            if (!hasError) {
                validLines.push(line);
            } else {
                return null;
            }
        }

        if (validLines.length === 0) {
            showError("No valid data found. Make sure you pasted comma-separated values.");
            return null;
        }

        return validLines;
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }

    function formatPopName(name) {
        if (name === 'East_Asian') return 'EAST ASIAN';
        return name.toUpperCase();
    }

    function renderMultiResults(allResults, headers) {
        let html = `
            <div class="results-table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th class="col-target">TARGET</th>
        `;

        headers.forEach(popName => {
            const displayName = formatPopName(popName);
            const color = POP_COLORS[popName] || '#c9d1d9';
            html += `<th class="col-pop" style="color: ${color}">${displayName} <span class="arrow">▼</span></th>`;
        });

        html += `<th class="col-pop" style="color: #8c8173">DISTANCE</th>`;

        html += `
                        </tr>
                    </thead>
                    <tbody>
        `;

        allResults.forEach(res => {
            html += `<tr><td class="col-target"><em>${res.targetName}</em></td>`;

            // Map the breakdown array logic into a fast dictionary for this row
            const scoreDict = {};
            res.breakdown.forEach(item => {
                scoreDict[item[0]] = item[1];
            });

            // Iterate over all globally known headers to create columns
            headers.forEach(popName => {
                const score = scoreDict[popName] || 0;
                // Only write a percentage if it actually contributed something
                if (score > 0.0001) {
                    const percentage = (score * 100).toFixed(2) + '%';
                    const color = POP_COLORS[popName] || '#c9d1d9';
                    html += `<td class="col-pop" style="color: ${color}">${percentage}</td>`;
                } else {
                    html += `<td class="col-pop" style="color: #444">-</td>`;
                }
            });

            const distancePercent = (res.distance * 100).toFixed(4) + '%';
            html += `<td class="col-pop" style="color: #8c8173">${distancePercent}</td>`;

            html += `</tr>`;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        resultsContainer.innerHTML = html;
        resultsContainer.classList.add('fade-in');
    }
});
