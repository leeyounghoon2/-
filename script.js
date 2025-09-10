document.addEventListener('DOMContentLoaded', function() {
    const quotationBody = document.getElementById('quotationBody');
    const addRowBtn = document.getElementById('addRowBtn');
    const removeRowBtn = document.getElementById('removeRowBtn');
    const totalFinalAmountCell = document.getElementById('totalFinalAmount');
    const completeBtn = document.getElementById('completeBtn');

    // ===========================================
    // 고객 연락처 자동 하이픈 추가 기능 (추가된 부분)
    // ===========================================
    const customerContactInput = document.querySelector('.customer-contact');

    if (customerContactInput) {
        customerContactInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9]/g, ''); // 숫자 이외의 문자 제거
            let formattedValue = '';

            if (value.length > 11) {
                value = value.substring(0, 11); // 11자리 초과하면 잘라냄
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
    // (이전 코드와 동일)
    // ===========================================
    let savedLocations = new Set();
    const LOCAL_STORAGE_KEY = 'saved_quotation_locations';

    function loadSavedLocations() {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            savedLocations = new Set(JSON.parse(stored));
        }
    }

    function saveLocations() {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(savedLocations)));
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
            suggestionBox = document.createElement('div');
            suggestionBox.className = 'suggestions';
            parentTd.appendChild(suggestionBox);
        }

        suggestionBox.innerHTML = '';
        suggestionBox.style.display = 'block';

        let hasSuggestions = false;
        Array.from(savedLocations).forEach(location => {
            if (location.toLowerCase().includes(searchTerm)) {
                const suggestionItem = document.createElement('div');
                suggestionItem.textContent = location;
                suggestionItem.className = 'suggestion-item';
                suggestionItem.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    inputElement.value = location;
                    suggestionBox.style.display = 'none';
                    updateLocationNumbering();
                    inputElement.focus();
                });
                suggestionBox.appendChild(suggestionItem);
                hasSuggestions = true;
            }
        });

        if (!hasSuggestions || searchTerm === '') {
            suggestionBox.style.display = 'none';
        }
    }

    function hideSuggestions(inputElement) {
        const parentTd = inputElement.closest('td');
        const suggestionBox = parentTd.querySelector('.suggestions');
        if (suggestionBox) {
            setTimeout(() => {
                suggestionBox.style.display = 'none';
            }, 100);
        }
    }

    // ===========================================
    // 시공위치 자동 번호 매기기
    // (이전 코드와 동일)
    // ===========================================
    function updateLocationNumbering() {
        const locationInputs = quotationBody.querySelectorAll('.location-input');
        const baseLocationOccurrences = new Map();

        locationInputs.forEach(input => {
            const fullValue = input.value.trim();
            if (fullValue === '') return;

            const baseName = fullValue.replace(/( \d+-\d+|\s?\d+)$/, '').trim();
            addLocationToSaved(baseName || fullValue);

            const effectiveBaseName = baseName || fullValue;
            if (!baseLocationOccurrences.has(effectiveBaseName)) {
                baseLocationOccurrences.set(effectiveBaseName, []);
            }
            baseLocationOccurrences.get(effectiveBaseName).push(input);
        });

        baseLocationOccurrences.forEach((inputsForBase, baseName) => {
            let defaultCount = 0;
            let livingRoomCount = 0;

            inputsForBase.forEach(input => {
                let newValue = input.value;

                if (baseName === '거실') {
                    livingRoomCount++;
                    newValue = `${baseName} 1-${livingRoomCount}`;
                } else if (baseName) {
                    defaultCount++;
                    newValue = `${baseName}${defaultCount}`;
                }

                if (input.value !== newValue) {
                    input.value = newValue;
                    const event = new Event('input', { bubbles: true });
                    input.dispatchEvent(event);
                }
            });
        });
        updateTotalSum();
    }

    // ===========================================
    // 각 행에 대한 기능 설정 (최종금액 계산, 이벤트 리스너 등)
    // (이전 코드와 동일)
    // ===========================================
    function setupRow(row) {
        const checkItem = row.querySelector('.check-item');
        const locationInput = row.querySelector('.location-input');
        const widthInput = row.querySelector('.width-input');
        const heightInput = row.querySelector('.height-input');
        const optionCheckbox = row.querySelector('.option-checkbox');
        const finalAmountCell = row.querySelector('.final-amount-cell');

        function updateFinalAmount() {
            let baseAmount = 0;
            const width = parseFloat(widthInput.value) || 0;
            const height = parseFloat(heightInput.value) || 0;

            if (checkItem.checked && (width > 0 || height > 0)) {
                baseAmount = Math.max(width, height) / 1000 * 25000;
            } else {
                baseAmount = 0;
            }

            let finalAmount = baseAmount;
            if (optionCheckbox.checked) {
                finalAmount += 15000;
            }
            finalAmountCell.textContent = finalAmount.toLocaleString('ko-KR') + '원';

            updateTotalSum();
        }

        locationInput.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                checkItem.checked = true;
                showSuggestions(this);
            } else {
                checkItem.checked = false;
                hideSuggestions(this);
            }
        });

        locationInput.addEventListener('focus', function() {
            showSuggestions(this);
        });

        locationInput.addEventListener('blur', function() {
            hideSuggestions(this);
            if (this.value.trim() !== '') {
                const currentBaseName = this.value.
