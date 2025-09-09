document.addEventListener('DOMContentLoaded', async () => {
    const treeContainer = document.getElementById('tree-container');
    const runButton = document.getElementById('runButton');
    const dataDisplay = document.getElementById('data-display');
    let treeData = null;
    let testData = null;
    let currentDataIndex = 0;
    const batchSize = 20;

    // Fetch the decision tree and test data
    try {
        const [treeResponse, testDataResponse] = await Promise.all([
            fetch('nba_tree.json'),
            fetch('test_data.json')
        ]);
        if (!treeResponse.ok) throw new Error(`HTTP error! status: ${treeResponse.status}`);
        if (!testDataResponse.ok) throw new Error(`HTTP error! status: ${testDataResponse.status}`);
        
        treeData = await treeResponse.json();
        testData = await testDataResponse.json();
    } catch (error) {
        console.error("Could not load data:", error);
        treeContainer.innerHTML = '<p>Error: Could not load data. Please run the Python script first.</p>';
        return;
    }

    // 1. Draw the tree
    function drawTree(node, x, y, level) {
        if (!node) return;

        const nodeElement = document.createElement('div');
        nodeElement.classList.add('node');
        
        // Add class for color coding leaf nodes
        if (!node.children) {
            const className = node.name.split(': ')[1].toLowerCase();
            nodeElement.classList.add(`class-${className}`);
        }

        nodeElement.style.left = `${x - 50}px`;
        nodeElement.style.top = `${y - 50}px`;
        nodeElement.innerHTML = ''; // No text inside
        treeContainer.appendChild(nodeElement);
        node.element = nodeElement;
        node.x = x;
        node.y = y;
        node.points = []; // Track points in this node

        // Create label outside the node
        const labelElement = document.createElement('div');
        labelElement.classList.add('node-label');
        labelElement.innerHTML = node.name.replace('<=', '&le;');
        labelElement.style.left = `${x - 60}px`;
        labelElement.style.top = `${y + 60}px`;
        treeContainer.appendChild(labelElement);

        if (node.children && node.children.length > 0) {
            const ySpacing = 80 + level * 60; // Smaller spacing at top (flatter), larger at bottom (more vertical)
            const containerWidth = treeContainer.offsetWidth;
            const xSpacing = Math.max(140, containerWidth / Math.pow(2, level + 1.5));

            const leftChild = node.children[0];
            if (leftChild) {
                const leftX = x - xSpacing;
                const leftY = y + ySpacing; // Symmetric, no stagger
                drawLine({x, y}, {x: leftX, y: leftY});
                drawTree(leftChild, leftX, leftY, level + 1);
            }

            const rightChild = node.children[1];
            if (rightChild) {
                const rightX = x + xSpacing;
                const rightY = y + ySpacing; // Symmetric, no stagger
                drawLine({x, y}, {x: rightX, y: rightY});
                drawTree(rightChild, rightX, rightY, level + 1);
            }
        }
    }

    function drawLine(parent, child) {
        const line = document.createElement('div');
        line.classList.add('line');
        
        const x1 = parent.x;
        const y1 = parent.y;
        const x2 = child.x;
        const y2 = child.y;

        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

        line.style.width = `${length}px`;
        line.style.left = `${x1}px`;
        line.style.top = `${y1}px`;
        line.style.transform = `rotate(${angle}deg)`;
        
        treeContainer.appendChild(line);
    }

    // 2. Animate the next batch of data points
    async function runNextBatch() {
        if (testData.length === 0) {
            dataDisplay.innerHTML = "<p>No test data available.</p>";
            return;
        }

        runButton.disabled = true;
        
        if (currentDataIndex === 0) {
            document.querySelectorAll('.point').forEach(p => p.remove());
            dataDisplay.innerHTML = `<strong>Processing data points:</strong><br>`;
        }

        const startIndex = currentDataIndex;
        const endIndex = Math.min(startIndex + batchSize, testData.length);
        let summaryHtml = dataDisplay.innerHTML;

        for (let i = startIndex; i < endIndex; i++) {
            const item = testData[i];
            const point = document.createElement('div');
            point.id = `point-${i}`;
            point.classList.add('point');
            treeContainer.appendChild(point);

            point.style.left = `${treeData.x - 10}px`;
            point.style.top = `${treeData.y - 10}px`;

            let currentNode = treeData;
            const path = [treeData];
            while (currentNode.children) {
                const feature = currentNode.feature;
                const threshold = currentNode.threshold;
                const inputValue = item.features[feature];
                if (inputValue <= threshold) {
                    currentNode = currentNode.children[0];
                } else {
                    currentNode = currentNode.children[1];
                }
                path.push(currentNode);
            }
            
            const predictedClass = currentNode.name.split(': ')[1].toLowerCase();
            point.classList.add(`class-${predictedClass}`);

            // Add tooltip with player information
            point.title = `Player: ${item.player_name}\nPredicted Position: ${predictedClass.toUpperCase()}\nActual Position: ${item.actual_class_name}\nAge: ${item.features.Age}\nGames: ${item.features.G}\nPoints: ${item.features.PTS}\nAssists: ${item.features.AST}\nRebounds: ${item.features.TRB}`;

            // Add point to node's points array
            currentNode.points.push(point);

            // Calculate grid position within the node
            const cols = 3;
            const index = currentNode.points.length - 1;
            const row = Math.floor(index / cols);
            const col = index % cols;
            const gridSpacing = 20; // point size
            const gridWidth = cols * gridSpacing;
            const gridHeight = Math.ceil(currentNode.points.length / cols) * gridSpacing;
            const startX = currentNode.x - gridWidth / 2 + gridSpacing / 2;
            const startY = currentNode.y - gridHeight / 2 + gridSpacing / 2;
            const endX = startX + col * gridSpacing;
            const endY = startY + row * gridSpacing;

            // Animate along the path
            for (let j = 1; j < path.length; j++) {
                const targetNode = path[j];
                await new Promise(resolve => {
                    const startX_anim = parseFloat(point.style.left);
                    const startY_anim = parseFloat(point.style.top);
                    const endX_anim = (j === path.length - 1) ? endX : targetNode.x - 10;
                    const endY_anim = (j === path.length - 1) ? endY : targetNode.y - 10;

                    let startTime = null;
                    const duration = 15;

                    function animationStep(timestamp) {
                        if (!startTime) startTime = timestamp;
                        const progress = Math.min((timestamp - startTime) / duration, 1);

                        point.style.left = `${startX_anim + (endX_anim - startX_anim) * progress}px`;
                        point.style.top = `${startY_anim + (endY_anim - startY_anim) * progress}px`;

                        if (progress < 1) {
                            requestAnimationFrame(animationStep);
                        } else {
                            resolve();
                        }
                    }
                    requestAnimationFrame(animationStep);
                });
            }
            summaryHtml += `Point ${i + 1}: Predicted ${predictedClass}, Actual ${item.actual_class_name}<br>`;
            dataDisplay.innerHTML = summaryHtml;
            dataDisplay.scrollTop = dataDisplay.scrollHeight;
        }
        
        currentDataIndex = endIndex;

        if (currentDataIndex >= testData.length) {
            runButton.textContent = "All Done";
            runButton.disabled = true;
            dataDisplay.innerHTML += "<p>All data points have been processed.</p>";
        } else {
            const remaining = testData.length - currentDataIndex;
            runButton.textContent = `Run Next ${Math.min(batchSize, remaining)}`;
            runButton.disabled = false;
        }
    }

    // Initial setup
    function initialize() {
        treeContainer.innerHTML = '';
        drawTree(treeData, treeContainer.offsetWidth / 2, 50, 1);
        currentDataIndex = 0;
        runButton.disabled = false;
        runButton.textContent = `Run First ${batchSize}`;
        dataDisplay.innerHTML = `<p>Click "Run" to animate the first ${batchSize} test data points.</p>`;
    }

    runButton.addEventListener('click', runNextBatch);
    window.addEventListener('resize', initialize);
    initialize();
});
