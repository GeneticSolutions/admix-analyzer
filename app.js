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
        if (!targetArray) return;

        const expectedDimensions = currentSources[0].length;
        if (targetArray[0].length !== expectedDimensions) {
            showError(`Column mismatch. Expected ${expectedDimensions - 1} coordinates, found ${targetArray[0].length - 1}. Please provide full G25 coordinates.`);
            return;
        }

        try {
            runBtn.textContent = 'Calculating...';
            runBtn.disabled = true;

            setTimeout(() => {
                const results = runAdmixtureCore(targetArray, currentSources, 0, 0);
                renderResults(targetArray[0][0], results);

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
        let line = lines[0].split(",");

        if (line.length <= 1) {
            showError("Data format error. Make sure you pasted comma-separated values (e.g., Name,0.01,0.02,...)");
            return null;
        }

        for (let j = 1; j < line.length; j++) {
            if (isNaN(Number(line[j]))) {
                showError("Non-numerical value detected in coordinates.");
                return null;
            }
            line[j] = Number(line[j]);
        }

        return [line];
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }

    function formatPopName(name) {
        if (name === 'East_Asian') return 'EAST ASIAN';
        return name.toUpperCase();
    }

    function renderResults(targetName, resultData) {
        const distancePercent = (resultData.distance * 100).toFixed(4);

        // Filter out zero contributions for cleaner table
        const validBreakdown = resultData.breakdown.filter(item => item[1] > 0.0001);

        // Sort order to match the picture (Steppe, East Asian, AASI, Farmer...)
        // Although the picture has this specific order, we will keep the sorted order from the solver which is descending score
        // However, if we want to ensure exact presentation, we can render the ones provided.
        // Let's stick with the descending score so the major components are first.

        let html = `
            <div class="results-table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th class="col-target">TARGET</th>
        `;

        validBreakdown.forEach(item => {
            const displayName = formatPopName(item[0]);
            const color = POP_COLORS[item[0]] || '#c9d1d9';
            html += `<th class="col-pop" style="color: ${color}">${displayName} <span class="arrow">▼</span></th>`;
        });

        html += `
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="col-target"><em>${targetName}</em></td>
        `;

        validBreakdown.forEach(item => {
            const score = item[1];
            const percentage = (score * 100).toFixed(2) + '%';
            const color = POP_COLORS[item[0]] || '#c9d1d9';
            html += `<td class="col-pop" style="color: ${color}">${percentage}</td>`;
        });

        html += `
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="distance-badge-simple">Distance: ${distancePercent}%</div>
        `;

        resultsContainer.innerHTML = html;
        resultsContainer.classList.add('fade-in');
    }
});
