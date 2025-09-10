document.addEventListener('DOMContentLoaded', function() {
    const quotationBody = document.getElementById('quotationBody');
    const addRowBtn = document.getElementById('addRowBtn');
    const removeRowBtn = document.getElementById('removeRowBtn');
    const totalFinalAmountCell = document.getElementById('totalFinalAmount');

    // 고객 정보 입력 필드 가져오기
    const customerNameInput = document.getElementById('customerNameInput');
    const customerContactInput = document.getElementById('customerContactInput');
    const customerAddressInput = document.getElementById('customerAddressInput');
    const constructionDateInput = document.getElementById('constructionDateInput');

    // 완료 버튼 및 저장 옵션 모달 관련 요소 가져오기
    const completeBtn = document.getElementById('completeBtn');
    const saveOptionsModal = document.getElementById('saveOptionsModal');
    const closeButton = saveOptionsModal.querySelector('.close-button');
    const saveAsJpgBtn = document.getElementById('saveAsJpgBtn');
    const saveAsPdfBtn = document.getElementById('saveAsPdfBtn');
    const saveAsExcelBtn = document.getElementById('saveAsExcelBtn');


    // ===========================================
    // 자동 완성 (Autocomplete) 관련 변수 및 함수
    // ===========================================
    let savedLocations = new Set(); // 고유한 시공위치 목록 저장
    const LOCAL_STORAGE_KEY = 'saved_quotation_locations'; // 로컬 스토리지 키

    // 로컬 스토리지에서 저장된 위치 목록 불러오기
    function loadSavedLocations() {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            savedLocations = new Set(JSON.parse(stored));
        }
    }

    // 로컬 스토리지에 위치 목록 저장하기
    function saveLocations() {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(savedLocations)));
    }

    // 새 위치를 저장 목록에 추가하고 저장하기
    function addLocationToSaved(location) {
        const trimmedLocation = location.trim();
        if (trimmedLocation && !savedLocations.has(trimmedLocation)) {
            savedLocations.add(trimmedLocation);
            saveLocations();
        }
    }

    // 자동 완성 제안 목록 표시
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

    // 자동 완성 제안 목록 숨기기
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
    // 각 행에 대한 기능 설정 (금액 계산, 이벤트 리스너 등)
    // ===========================================
    function setupRow(row) {
        const checkItem = row.querySelector('.check-item');
        const locationInput = row.querySelector('.location-input');
        const widthInput = row.querySelector('.width-input');
        const heightInput = row.querySelector('.height-input');
        const amountCell = row.querySelector('.amount-cell');
        const optionCheckbox = row.querySelector('.option-checkbox');
        const finalAmountCell = row.querySelector('.final-amount-cell');

        function updateAmountsAndTotal() {
            let baseAmount = 0;

            if (checkItem.checked) {
                let width = parseFloat(widthInput.value) || 0;
                const height = parseFloat(heightInput.value) || 0;

                // **사이즈(가로)가 1000 이하면 1000으로 계산**
                if (width > 0 && width <= 1000) {
                    width = 1000;
                }

                if (width > 0 || height > 0) {
                    baseAmount = Math.max(width, height) / 1000 * 25000;
                }
                amountCell.textContent = baseAmount.toLocaleString('ko-KR') + '원';
            } else {
                amountCell.textContent = '';
            }

            let finalAmount = baseAmount;
            if (optionCheckbox.checked) {
                finalAmount += 15000;
            }
            finalAmountCell.textContent = finalAmount.toLocaleString('ko-KR') + '원';

            updateTotalSum();
        }

        // 이벤트 리스너를 다시 바인딩하여 계산이 정상적으로 동작하도록 함
        checkItem.addEventListener('change', updateAmountsAndTotal);
        locationInput.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                checkItem.checked = true;
                showSuggestions(this);
            } else {
                checkItem.checked = false;
                hideSuggestions(this);
            }
            updateAmountsAndTotal();
        });
        widthInput.addEventListener('input', updateAmountsAndTotal);
        heightInput.addEventListener('input', updateAmountsAndTotal);
        optionCheckbox.addEventListener('change', updateAmountsAndTotal);

        locationInput.addEventListener('focus', function() {
            showSuggestions(this);
        });

        locationInput.addEventListener('blur', function() {
            hideSuggestions(this);
            if (this.value.trim() !== '') {
                const currentBaseName = this.value.replace(/( \d+-\d+|\s?\d+)$/, '').trim();
                addLocationToSaved(currentBaseName || this.value.trim());
                updateLocationNumbering();
            } else {
                checkItem.checked = false;
                updateAmountsAndTotal();
            }
        });

        // 초기 로드 시 체크박스 상태에 따른 금액 업데이트
        updateAmountsAndTotal();

        // 위치 입력 필드에 값이 있으면 초기 체크박스를 체크 상태로
        if (locationInput.value.trim() !== '') {
            checkItem.checked = true;
            updateAmountsAndTotal();
        }
    }

    // ===========================================
    // 총 합계 계산 및 업데이트 함수
    // ===========================================
    function updateTotalSum() {
        let totalSum = 0;
        const allFinalAmountCells = document.querySelectorAll('.final-amount-cell');

        allFinalAmountCells.forEach(cell => {
            const amountText = cell.textContent.replace('원', '').replace(/,/g, '');
            const amount = parseFloat(amountText) || 0;
            totalSum += amount;
        });

        totalFinalAmountCell.textContent = totalSum.toLocaleString('ko-KR') + '원';
    }

    // ===========================================
    // 행 추가/제거 기능
    // ===========================================

    // 행 추가 버튼 클릭 이벤트
    addRowBtn.addEventListener('click', function() {
        const newRow = document.createElement('tr');
        newRow.className = 'quotation-row';

        const td1 = document.createElement('td'); const input1 = document.createElement('input'); input1.type = 'checkbox'; input1.className = 'check-item'; td1.appendChild(input1); newRow.appendChild(td1);
        const td2 = document.createElement('td'); const input2 = document.createElement('input'); input2.type = 'text'; input2.className = 'location-input'; td2.appendChild(input2); newRow.appendChild(td2);
        const td3 = document.createElement('td'); const input3 = document.createElement('input'); input3.type = 'number'; input3.className = 'width-input'; input3.step = '100'; td3.appendChild(input3); newRow.appendChild(td3);
        const td4 = document.createElement('td'); const input4 = document.createElement('input'); input4.type = 'number'; input4.className = 'height-input'; input4.step = '100'; td4.appendChild(input4); newRow.appendChild(td4);
        const td5 = document.createElement('td'); td5.className = 'amount-cell'; td5.textContent = ''; newRow.appendChild(td5);
        const td6 = document.createElement('td'); const input6 = document.createElement('input'); input6.type = 'checkbox'; input6.className = 'option-checkbox'; td6.appendChild(input6); newRow.appendChild(td6);
        const td7 = document.createElement('td'); td7.className = 'final-amount-cell'; td7.textContent = ''; newRow.appendChild(td7);
        const td8 = document.createElement('td'); const input8 = document.createElement('input'); input8.type = 'text'; input8.className = 'remarks-input'; td8.appendChild(input8); newRow.appendChild(td8);

        quotationBody.appendChild(newRow);
        setupRow(newRow); // 새로 추가된 행에 이벤트 리스너 설정
        updateLocationNumbering(); // 행 추가 후 번호 재매김
    });

    // 행 제거 버튼 클릭 이벤트
    removeRowBtn.addEventListener('click', function() {
        const allRows = quotationBody.querySelectorAll('.quotation-row');
        const checkedCheckboxes = quotationBody.querySelectorAll('.check-item:checked');
        let rowsToDelete = [];

        if (checkedCheckboxes.length > 0) {
            checkedCheckboxes.forEach(checkbox => {
                const row = checkbox.closest('tr.quotation-row');
                if (row) {
                    rowsToDelete.push(row);
                }
            });
        } else {
            if (allRows.length > 0) {
                rowsToDelete.push(allRows[allRows.length - 1]);
            }
        }

        if (allRows.length - rowsToDelete.length < 1) { // 최소 1개 행은 유지
            alert('더 이상 행을 제거할 수 없습니다. 최소 한 개의 행은 유지됩니다.');
            return;
        }

        rowsToDelete.forEach(row => {
            if (row.parentNode) {
                row.parentNode.removeChild(row);
            }
        });

        updateLocationNumbering(); // 행 제거 후 번호 재매김
    });

    // ===========================================
    // 파일 저장 기능
    // ===========================================

    // 파일 이름 생성 함수
    function generateFileName(extension) {
        let dateString;
        const constructionDateValue = constructionDateInput.value.trim();

        if (constructionDateValue) {
            dateString = constructionDateValue.replace(/-/g, '');
        } else {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            dateString = `${year}${month}${day}`;
        }
