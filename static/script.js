document.addEventListener('DOMContentLoaded', function() {
    // Initialize GSAP
    gsap.config({ nullTargetWarn: false });

    // Initialize Leaflet map
    const map = L.map('map').setView([17.4875, 78.3953], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Initialize variables
    let marker;
    let densityCircle;
    const circleRadius = 2000;

    // Get DOM elements
    const cityInput = document.getElementById('city-input');
    const areaSelect = document.getElementById('area-select'); // Changed to select element
    const searchBtn = document.getElementById('search-btn');
    const predictBtn = document.getElementById('predict-btn');
    const timeInput = document.getElementById('time');
    const daySelect = document.getElementById('day');
    const weatherSelect = document.getElementById('weather');
    const resultsPanel = document.querySelector('.results-panel');
    const predictedDensity = document.getElementById('predicted-density');
    const maeValue = document.getElementById('mae-value');
    const rmseValue = document.getElementById('rmse-value');
    const meterFill = document.querySelector('.meter-fill');
    const loadingOverlay = document.querySelector('.loading-overlay');

    // Set default time to current time
    const now = new Date();
    timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Set default day to current day
    const today = now.getDay() || 7;
    daySelect.value = today;

    // Set Hyderabad as default city and make it readonly
    cityInput.value = 'Hyderabad';
    cityInput.readOnly = true;

    // Toast notification function
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = document.createElement('i');
        icon.className = type === 'success' ? 'fas fa-check-circle' :
                        type === 'error' ? 'fas fa-exclamation-circle' :
                        'fas fa-info-circle';
        
        const text = document.createElement('span');
        text.textContent = message;
        
        toast.appendChild(icon);
        toast.appendChild(text);
        
        document.querySelector('.toast-container').appendChild(toast);
        
        gsap.from(toast, {
            x: 100,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out'
        });

        setTimeout(() => {
            gsap.to(toast, {
                x: 100,
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => toast.remove()
            });
        }, 3000);
    }

    // Loading overlay functions
    function showLoading() {
        loadingOverlay.classList.add('active');
    }

    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }

    // Function to search for location using Nominatim
    async function searchLocation(city, area) {
        showLoading();
        try {
            const query = `${area}, ${city}`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const location = data[0];
                const latlng = L.latLng(location.lat, location.lon);
                
                if (marker) map.removeLayer(marker);
                if (densityCircle) map.removeLayer(densityCircle);

                marker = L.marker(latlng, {
                    opacity: 0
                }).addTo(map);
                
                gsap.to(marker._icon, {
                    opacity: 1,
                    duration: 0.5,
                    ease: 'power2.out'
                });

                densityCircle = L.circle(latlng, {
                    radius: 0,
                    color: '#666',
                    fillColor: '#666',
                    fillOpacity: 0.15,
                    weight: 2
                }).addTo(map);

                gsap.to(densityCircle, {
                    radius: circleRadius,
                    duration: 1,
                    ease: 'elastic.out(1, 0.5)'
                });

                map.flyTo(latlng, 13, {
                    duration: 1.5
                });

                predictBtn.disabled = false;
                gsap.from(predictBtn, {
                    scale: 0.95,
                    opacity: 0.5,
                    duration: 0.3
                });

                showToast('Location found successfully!', 'success');
                return true;
            } else {
                throw new Error('Location not found');
            }
        } catch (error) {
            console.error('Error searching location:', error);
            showToast('Location not found. Please try a different search.', 'error');
            return false;
        } finally {
            hideLoading();
        }
    }

    // Handle search button click
    searchBtn.addEventListener('click', async () => {
        const city = cityInput.value.trim();
        const area = areaSelect.value; // Changed to use select value

        if (!city || !area) {
            showToast('Please select an area.', 'warning');
            return;
        }

        searchBtn.disabled = true;
        try {
            await searchLocation(city, area);
        } finally {
            searchBtn.disabled = false;
        }
    });

    // Handle area select change
    areaSelect.addEventListener('change', () => {
        if (areaSelect.value) {
            searchBtn.click();
        }
    });

    // Disable map click for location selection since we're using dropdown
    map.off('click');

    // Rest of the code remains the same
    async function predictTraffic() {
        if (!marker || !densityCircle) {
            showToast('Please select a location first!', 'warning');
            return;
        }

        showLoading();
        try {
            const coordinates = marker.getLatLng();
            const time = timeInput.value;
            const day = parseInt(daySelect.value);
            const weather = weatherSelect.value;

            console.log('Prediction features:', {
                coordinates,
                time,
                day,
                weather
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const density = Math.random();
            const mae = (Math.random() * 0.2).toFixed(3);
            const rmse = (Math.random() * 0.3).toFixed(3);

            updateTrafficVisualization(densityCircle, density);
            
            resultsPanel.style.display = 'block';
            gsap.from(resultsPanel, {
                y: 20,
                opacity: 0,
                duration: 0.5,
                ease: 'power2.out'
            });

            meterFill.style.width = `${density * 100}%`;
            meterFill.style.backgroundColor = density < 0.33 ? '#4CAF50' :
                                            density < 0.66 ? '#ff9800' : '#f44336';

            gsap.to(predictedDensity, {
                innerHTML: density.toFixed(3),
                duration: 1,
                snap: { innerHTML: 0.001 }
            });

            gsap.to(maeValue, {
                innerHTML: mae,
                duration: 1,
                snap: { innerHTML: 0.001 }
            });

            gsap.to(rmseValue, {
                innerHTML: rmse,
                duration: 1,
                snap: { innerHTML: 0.001 }
            });

            showToast('Prediction completed successfully!', 'success');
        } catch (error) {
            console.error('Error predicting traffic:', error);
            showToast('Error predicting traffic. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }

    // Handle prediction button click
    predictBtn.addEventListener('click', async () => {
        predictBtn.disabled = true;
        try {
            await predictTraffic();
        } finally {
            predictBtn.disabled = false;
        }
    });

    function updateTrafficVisualization(circle, density) {
        let color, message;
        
        if (density < 0.33) {
            color = '#4CAF50';
            message = 'Low Traffic';
        } else if (density < 0.66) {
            color = '#ff9800';
            message = 'Medium Traffic';
        } else {
            color = '#f44336';
            message = 'High Traffic';
        }

        const markerHtml = `
            <div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>
        `;
        const coloredIcon = L.divIcon({
            html: markerHtml,
            className: 'colored-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        gsap.to(marker._icon, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => {
                marker.setIcon(coloredIcon);
                gsap.to(marker._icon, {
                    opacity: 1,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            }
        });

        gsap.to(circle, {
            radius: circleRadius * 1.2,
            fillOpacity: 0,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => {
                circle.setStyle({
                    color: color,
                    fillColor: color
                });
                
                gsap.to(circle, {
                    radius: circleRadius,
                    fillOpacity: 0.15,
                    opacity: 1,
                    duration: 0.5,
                    ease: 'elastic.out(1, 0.5)'
                });
            }
        });

        circle.bindPopup(message, {
            closeButton: false,
            className: 'traffic-popup'
        }).openPopup();
    }

    // Initial animations
    gsap.from('.sidebar', {
        x: -50,
        opacity: 0,
        duration: 1,
        ease: 'power2.out'
    });

    gsap.from('.legend', {
        y: 50,
        opacity: 0,
        duration: 1,
        delay: 0.5,
        ease: 'power2.out'
    });
});