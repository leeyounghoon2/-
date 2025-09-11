document.addEventListener('DOMContentLoaded', function() {
    const quotationBody = document.getElementById('quotationBody');
    const addRowBtn = document.getElementById('addRowBtn');
    const removeRowBtn = document.getElementById('removeRowBtn');
    const totalFinalAmountCell = document.getElementById('totalFinalAmount');
    const completeBtn = document.getElementById('completeBtn');

    // ===========================================
    // 고객 연락처 자동 하이픈 추가 기능
    // ===========================================
    const customerContactInput = document.querySelector('.customer-contact');

    if (customerContactInput) {
        customerContactInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9]/g, '');
            let formattedValue = '';

            if (value.length > 11) {
                value = value.substring(0, 11);
            }

            if (value.length < 4) {
                formattedValue = value;
            } else if (value.length < 8) {
                formattedValue = value.substring(0, 3) + '-' + value.substring(3);
            } else {
                formattedValue = value.substring(0, 3) + '-' + value.substring(3, 7) + '-' + value.substring(7);
            }
            e.target.value = formattedValue;
        });
    }

    // ===========================================
    // 자동 완성 (Autocomplete) 관련 변수 및 함수
    // ===========================================
    let savedLocations = new Set();
    const LOCAL_STORAGE_KEY = 'saved_quotation_locations';

    function loadSavedLocations() {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            try {
                savedLocations = new Set(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse saved locations from localStorage.", e);
                savedLocations = new Set();
            }
        }
    }

    function saveLocations() {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(savedLocations)));
        } catch (e) {
            console.error("Failed to save locations to localStorage.", e);
        }
    }

    function addLocationToSaved(location) {
        const trimmedLocation = location.trim();
        if (trimmedLocation && !savedLocations.has(trimmedLocation)) {
            savedLocations.add(trimmedLocation);
            saveLocations();
        }
    }

    function showSuggestions(inputElement) {
        const searchTerm = inputElement.value.trim().toLowerCase();
        const parentTd = inputElement.closest('td');
        let suggestionBox = parentTd.querySelector('.suggestions');

        if (!suggestionBox) {
            suggestionBox
