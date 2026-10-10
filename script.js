
        // ---------------------------------------------------------
        // BLYNK CREDENTIALS CONFIGURATION (Yahan apne credentials dalein)
        // ---------------------------------------------------------
        const BLYNK_CONFIG = {
            TEMPLATE_ID: "TMPL3KnmZUUXG",     // Optional reference
            TEMPLATE_NAME: "GridAware", // Optional reference
            AUTH_TOKEN: "o9JDd8mamiDgDY7vPMI3EPI8SYJRDQXb"    // <-- Yahan apna actual Auth Token daalein
        };

        const cityNodes = {
            coer: { name: "COER University", lat: 29.8543, lng: 77.8880, hasNode: true },
            roorkee: { name: "Roorkee City Grid", lat: 29.8542, lng: 77.8885, hasNode: false },
            haridwar: { name: "Haridwar Central Substation", lat: 29.9457, lng: 78.1642, hasNode: false },
            dehradun: { name: "Dehradun Power House", lat: 30.3165, lng: 78.0322, hasNode: false }
        };

        let map, marker;
        let healthChart, tempChart, loadChart, vibChart;
        let chartDataStore = { health: [], temp: [], load: [], vibration: [] };

        window.addEventListener('DOMContentLoaded', () => {
            initMap();
            initCharts();
            // Pehli baar load hote hi API call karein
            fetchBlynkData();
        });

        function logout() {
            localStorage.removeItem('gridAwareAuth');
            window.location.href = 'login.html';
        }

        function initMap() {
            if (map) return;
            const coords = [cityNodes.coer.lat, cityNodes.coer.lng];
            map = L.map('map', { zoomControl: false }).setView(coords, 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: 'GridAware GIS'
            }).addTo(map);

            marker = L.marker(coords).addTo(map)
                .bindPopup("<b>COER University Substation</b><br>Awaiting Blynk Connection")
                .openPopup();
        }

        function handleCityChange() {
            const val = document.getElementById('citySelect').value;
            const nodeCont = document.getElementById('nodeContainer');
            const noNodeCont = document.getElementById('noNodeContainer');
            const totalNodes = document.getElementById('statTotalNodes');
            const activeNodes = document.getElementById('statActiveNodes');
            const offlineNodes = document.getElementById('statOfflineNodes');
            const coordLabel = document.getElementById('mapCoordinatesLabel');

            const nodeData = cityNodes[val];

            if (!nodeData || val === 'none') {
                nodeCont.classList.add('hidden');
                noNodeCont.classList.remove('hidden');
                totalNodes.innerText = "0";
                activeNodes.innerText = "0";
                offlineNodes.innerText = "0";
                return;
            }

            if (map) {
                map.setView([nodeData.lat, nodeData.lng], 15);
                marker.setLatLng([nodeData.lat, nodeData.lng]);
                marker.setPopupContent(`<b>${nodeData.name}</b><br>${nodeData.hasNode ? 'ESP32 Node Assigned' : 'No Node Connected'}`);
                setTimeout(() => map.invalidateSize(), 200);
            }
            coordLabel.innerText = `Coordinates: ${nodeData.lat.toFixed(4)}° N, ${nodeData.lng.toFixed(4)}° E`;

            if (nodeData.hasNode) {
                nodeCont.classList.remove('hidden');
                noNodeCont.classList.add('hidden');
                totalNodes.innerText = "1";
            } else {
                nodeCont.classList.add('hidden');
                noNodeCont.classList.remove('hidden');
                totalNodes.innerText = "0";
                activeNodes.innerText = "0";
                offlineNodes.innerText = "1";
            }
        }

        function initCharts() {
            const commonOpts = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } },
                elements: { line: { tension: 0.4, borderWidth: 2 }, point: { radius: 0 } }
            };

            healthChart = new Chart(document.getElementById('chartHealth'), {
                type: 'line', data: { labels: [], datasets: [{ data: [], borderColor: '#4cc9f0', fill: true, backgroundColor: 'rgba(76,201,240,0.05)' }] }, options: commonOpts
            });
            tempChart = new Chart(document.getElementById('chartTemp'), {
                type: 'line', data: { labels: [], datasets: [{ data: [], borderColor: '#fbb13c', fill: true, backgroundColor: 'rgba(251,177,60,0.05)' }] }, options: commonOpts
            });
            loadChart = new Chart(document.getElementById('chartLoad'), {
                type: 'line', data: { labels: [], datasets: [{ data: [], borderColor: '#3a86ff', fill: true, backgroundColor: 'rgba(58,134,255,0.05)' }] }, options: commonOpts
            });
            vibChart = new Chart(document.getElementById('chartVibration'), {
                type: 'line', data: { labels: [], datasets: [{ data: [], borderColor: '#9b5de5', fill: true, backgroundColor: 'rgba(155,93,229,0.05)' }] }, options: commonOpts
            });
        }

        // STRICT BLYNK API FETCHER (NO FAKE DATA)
        async function fetchBlynkData() {
            const token = BLYNK_CONFIG.AUTH_TOKEN;
            const statusText = document.getElementById('systemStatusText');
            const statusBadge = document.getElementById('statusBadge');
            const statusDot = document.getElementById('statusDot');
            const activeNodes = document.getElementById('statActiveNodes');
            const offlineNodes = document.getElementById('statOfflineNodes');
            const nodeStateText = document.getElementById('nodeStateText');
            const unitBadge = document.getElementById('unitBadge');

            // Agar token configured nahi hai
            if (!token || token === "YOUR_BLYNK_AUTH_TOKEN") {
                console.warn("Blynk Auth Token is missing or not configured in script.");
                statusText.innerText = "Token Missing / API Not Found";
                statusBadge.className = "flex items-center space-x-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full text-red-400 text-xs font-semibold";
                statusDot.className = "w-2 h-2 rounded-full bg-red-400";
                return;
            }

            try {
                // Blynk cloud endpoint requesting Virtual Pins: v0 (Health), v1 (Temp), v2 (Load), v3 (Vibration)
                const url = `https://blynk.cloud/external/api/get?token=${token}&v0&v1&v2&v3`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP Error status: ${response.status} - Invalid Token or API endpoint unreachable.`);
                }

                const data = await response.json();
                console.log("Blynk Telemetry Response:", data);

                // Check if valid data received
                if (data !== null && data !== undefined) {
                    // Update UI with REAL values fetched from Blynk
                    const health = data.v0 !== undefined && data.v0 !== "" ? data.v0 : "--";
                    const temp = data.v1 !== undefined && data.v1 !== "" ? data.v1 : "--";
                    const load = data.v2 !== undefined && data.v2 !== "" ? data.v2 : "--";
                    const vib = data.v3 !== undefined && data.v3 !== "" ? data.v3 : "--";

                    document.getElementById('valHealth').innerText = health !== "--" ? health + "%" : "--";
                    document.getElementById('valTemp').innerText = temp !== "--" ? temp + " °C" : "--";
                    document.getElementById('valLoad').innerText = load !== "--" ? load + " A" : "--";
                    document.getElementById('valVibration').innerText = vib !== "--" ? vib + " g" : "--";

                    // Set Online Active Status
                    statusText.innerText = "Live ESP32 Connected";
                    statusBadge.className = "flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-400 text-xs font-semibold";
                    statusDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
                    
                    activeNodes.innerText = "1";
                    activeNodes.className = "text-3xl font-bold mt-2 text-emerald-400";
                    offlineNodes.innerText = "0";
                    nodeStateText.innerText = "Real-time streaming active";
                    unitBadge.className = "px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold";
                    unitBadge.innerHTML = '<i class="fa-solid fa-wave-square mr-1"></i> TR-COER (Live)';

                    // Push to charts if valid numeric data
                    if (health !== "--") updateChart(healthChart, health);
                    if (temp !== "--") updateChart(tempChart, temp);
                    if (load !== "--") updateChart(loadChart, load);
                    if (vib !== "--") updateChart(vibChart, vib);
                }

            } catch (error) {
                console.error("Blynk Connection Error:", error.message);
                statusText.innerText = "API Error / Node Offline";
                statusBadge.className = "flex items-center space-x-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full text-red-400 text-xs font-semibold";
                statusDot.className = "w-2 h-2 rounded-full bg-red-400";
                
                activeNodes.innerText = "0";
                activeNodes.className = "text-3xl font-bold mt-2 text-red-400";
                offlineNodes.innerText = "1";
                nodeStateText.innerText = "Check console for details";
            }
        }

        function updateChart(chart, val) {
            const numVal = parseFloat(val);
            if(isNaN(numVal)) return;
            
            if (chart.data.labels.length > 10) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            chart.data.labels.push('');
            chart.data.datasets[0].data.push(numVal);
            chart.update('none');
        }

        // Auto poll every 5 seconds for live Blynk stream
        setInterval(() => {
            if (document.getElementById('citySelect').value === 'coer') {
                fetchBlynkData();
            }
        }, 5000);
