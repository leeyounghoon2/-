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
            const pricePerMeter = 28000;
            const optionPrice = 15000;
            
            // -----------------------------------------------------------
            // 📌 변경된 세로 계산 로직 
            // -----------------------------------------------------------
            let effectiveHeight = height; 
            
            if (height >= 100 && height <= 1000) {
                // 세로 100mm ~ 1000mm 시: 세로 길이를 1000mm로 고정 (28000원 적용)
                effectiveHeight = 1000; 
            } else if (height < 100) {
                // 세로 100mm 미만은 금액 계산하지 않음 (baseAmount = 0)
                effectiveHeight = 0;
            }
            // 1000mm 초과는 기존처럼 실제 height 값 사용
            
            if (checkItem.checked && effectiveHeight > 0) {
                // 세로 기본 단가: effectiveHeight / 1000 * 28000
                const basePricePerHeight = (effectiveHeight / 1000) * pricePerMeter;
                
                if (width > 1000) {
                    // 가로 1000 초과 시: (세로 기본 단가) * (가로 / 1000)
                    baseAmount = basePricePerHeight * (width / 1000);
                } else if (width >= 100) { 
                    // 가로 100~1000일 경우: 세로 기본 단가만 적용
                    baseAmount = basePricePerHeight;
                } else {
                    // 가로 100 미만은 금액 계산하지 않음
                    baseAmount = 0;
                }
            } else {
                baseAmount = 0;
            }
            
            let finalAmount = Math.round(baseAmount); // 최종 금액은 반올림
            if (optionCheckbox.checked) {
                finalAmount += optionPrice;
            }
            
            finalAmountCell.textContent = finalAmount.toLocaleString('ko-KR') + '원';

            updateTotalSum();
        }
        // ... (이하 나머지 setupRow 함수 내용은 기존과 동일)
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
                const currentBaseName = this.value.replace(/( \d+-\d+|\s?\d+)$/, '').trim();
                addLocationToSaved(currentBaseName || this.value.trim());
                updateLocationNumbering();
            } else {
                checkItem.checked = false;
                updateFinalAmount();
            }
        });

        checkItem.addEventListener('change', updateFinalAmount);
        widthInput.addEventListener('input', updateFinalAmount);
        heightInput.addEventListener('input', updateFinalAmount);
        optionCheckbox.addEventListener('change', updateFinalAmount);

        if (locationInput.value.trim() !== '') {
            checkItem.checked = true;
        }
        updateFinalAmount();
    }

    // ===========================================
    // 총 합계 계산 및 업데이트 함수
    // (이전 코드와 동일)
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
    // (이전 코드와 동일)
    // ===========================================
    addRowBtn.addEventListener('click', function() {
        const newRow = document.createElement('tr');
        newRow.className = 'quotation-row';

        const td1 = document.createElement('td'); const input1 = document.createElement('input'); input1.type = 'checkbox'; input1.className = 'check-item'; td1.appendChild(input1); newRow.appendChild(td1);
        const td2 = document.createElement('td'); const input2 = document.createElement('input'); input2.type = 'text'; input2.className = 'location-input'; td2.appendChild(input2); newRow.appendChild(td2);
        const td3 = document.createElement('td'); const input3 = document.createElement('input'); input3.type = 'number'; input3.className = 'width-input'; input3.step = '100'; td3.appendChild(input3); newRow.appendChild(td3);
        const td4 = document.createElement('td'); const input4 = document.createElement('input'); input4.type = 'number'; input4.className = 'height-input'; input4.step = '100'; td4.appendChild(input4); newRow.appendChild(td4);
        const td6 = document.createElement('td'); const input6 = document.createElement('input'); input6.type = 'checkbox'; input6.className = 'option-checkbox'; td6.appendChild(input6); newRow.appendChild(td6);
        const td7 = document.createElement('td'); td7.className = 'final-amount-cell'; td7.textContent = ''; newRow.appendChild(td7);
        const td8 = document.createElement('td'); const input8 = document.createElement('input'); input8.type = 'text'; input8.className = 'remarks-input'; td8.appendChild(input8); newRow.appendChild(td8);

        quotationBody.appendChild(newRow);
        setupRow(newRow);
        updateLocationNumbering();
    });

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

        if (rowsToDelete.length === 0 || allRows.length - rowsToDelete.length < 1) {
            alert('더 이상 행을 제거할 수 없습니다. 최소 한 개의 행은 유지됩니다.');
            return;
        }

        rowsToDelete.forEach(row => {
            if (row.parentNode) {
                row.parentNode.removeChild(row);
            }
        });

        updateLocationNumbering();
    });

    // ===========================================
    // 완료 버튼 (JPG 저장) 기능 강화
    // (이전 코드와 동일)
    // ===========================================
    completeBtn.addEventListener('click', function() {
        const quotationContainer = document.querySelector('.quotation-container');
        const originalOverflowX = quotationContainer.style.overflowX;

        document.body.classList.add('capture-mode');

        const customerInputs = document.querySelectorAll('.customer-info input[type="text"], .customer-info input[type="date"]');
        customerInputs.forEach(input => {
            if (input.value.trim() === '') {
                input.setAttribute('data-placeholder-text', input.placeholder || '');
                input.placeholder = '';
            }
        });

        quotationContainer.style.overflowX = 'visible';

        html2canvas(quotationContainer, {
            scale: 2,
            scrollY: -window.scrollY,
            useCORS: true,
            logging: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const image = canvas.toDataURL('image/jpeg', 0.9);

            const link = document.createElement('a');
            link.href = image;

            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const filename = `견적서_${year}${month}${day}_${hours}${minutes}.jpg`;
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert('견적서가 JPG 이미지로 저장되었습니다!');
        }).catch(error => {
            console.error('이미지 저장 중 오류 발생:', error);
            alert('이미지 저장 중 오류가 발생했습니다. 개발자 도구 콘솔을 확인해주세요.');
        }).finally(() => {
            document.body.classList.remove('capture-mode');
            quotationContainer.style.overflowX = originalOverflowX;

            customerInputs.forEach(input => {
                const originalPlaceholder = input.getAttribute('data-placeholder-text');
                if (originalPlaceholder !== null) {
                    input.placeholder = originalPlaceholder;
                    input.removeAttribute('data-placeholder-text');
                }
            });
        });
    });

    // ===========================================
    // 초기 설정 (페이지 로드 시)
    // (이전 코드와 동일)
    // ===========================================
    loadSavedLocations();

    const initialRows = quotationBody.querySelectorAll('.quotation-row');
    initialRows.forEach(setupRow);

    updateLocationNumbering();
});


