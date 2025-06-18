document.addEventListener('DOMContentLoaded', function() {
    const quotationBody = document.getElementById('quotationBody');
    const addRowBtn = document.getElementById('addRowBtn');
    const removeRowBtn = document.getElementById('removeRowBtn');
    const totalFinalAmountCell = document.getElementById('totalFinalAmount');
    const completeBtn = document.getElementById('completeBtn');

    // ===========================================
    // 자동 완성 (Autocomplete) 관련 변수 및 함수
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
        // const amountCell = row.querySelector('.amount-cell'); // 금액 셀 제거
        const optionCheckbox = row.querySelector('.option-checkbox');
        const finalAmountCell = row.querySelector('.final-amount-cell');

        // 해당 행의 최종 금액을 업데이트하는 함수
        function updateFinalAmount() {
            let baseAmount = 0;
            const width = parseFloat(widthInput.value) || 0;
            const height = parseFloat(heightInput.value) || 0;

            // 체크박스가 체크되어 있고, 가로 또는 세로 값이 있을 때만 기본 금액 계산
            if (checkItem.checked && (width > 0 || height > 0)) {
                baseAmount = Math.max(width, height) / 1000 * 25000;
            } else {
                baseAmount = 0; // 체크 해제되거나 값 없으면 0
            }

            let finalAmount = baseAmount;
            if (optionCheckbox.checked) {
                finalAmount += 15000; // 추가 옵션 선택 시 15000원 추가
            }
            finalAmountCell.textContent = finalAmount.toLocaleString('ko-KR') + '원';

            updateTotalSum();
        }

        // --- 이벤트 리스너 설정 ---

        locationInput.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                checkItem.checked = true;
                showSuggestions(this);
            } else {
                checkItem.checked = false;
                hideSuggestions(this);
            }
            // locationInput의 변경은 updateLocationNumbering에서 최종 금액 업데이트를 트리거함
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
                updateFinalAmount(); // 값이 없으면 최종 금액도 0으로
            }
        });

        // '체크' 박스, '가로', '세로', '추가옵션' 변경 시 최종금액 업데이트
        checkItem.addEventListener('change', updateFinalAmount);
        widthInput.addEventListener('input', updateFinalAmount);
        heightInput.addEventListener('input', updateFinalAmount);
        optionCheckbox.addEventListener('change', updateFinalAmount);

        if (locationInput.value.trim() !== '') {
            checkItem.checked = true;
        }
        // 초기 로드 시 금액 업데이트를 위해 호출
        updateFinalAmount();
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
    addRowBtn.addEventListener('click', function() {
        const newRow = document.createElement('tr');
        newRow.className = 'quotation-row';

        const td1 = document.createElement('td'); const input1 = document.createElement('input'); input1.type = 'checkbox'; input1.className = 'check-item'; td1.appendChild(input1); newRow.appendChild(td1);
        const td2 = document.createElement('td'); const input2 = document.createElement('input'); input2.type = 'text'; input2.className = 'location-input'; td2.appendChild(input2); newRow.appendChild(td2);
        const td3 = document.createElement('td'); const input3 = document.createElement('input'); input3.type = 'number'; input3.className = 'width-input'; input3.step = '100'; td3.appendChild(input3); newRow.appendChild(td3);
        const td4 = document.createElement('td'); const input4 = document.createElement('input'); input4.type = 'number'; input4.className = 'height-input'; input4.step = '100'; td4.appendChild(input4); newRow.appendChild(td4);
        // const td5 = document.createElement('td'); td5.className = 'amount-cell'; td5.textContent = ''; newRow.appendChild(td5); // 금액 셀 제거
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
    // ===========================================
    completeBtn.addEventListener('click', function() {
        const quotationContainer = document.querySelector('.quotation-container');
        const originalOverflowX = quotationContainer.style.overflowX; // 원래 overflow-x 상태 저장

        // 캡처 전에 임시 스타일 적용
        document.body.classList.add('capture-mode');

        // 고객 정보 입력 필드의 placeholder 텍스트를 실제 입력된 텍스트로 대체하여 이미지에 포함되도록 함
        const customerInputs = document.querySelectorAll('.customer-info input[type="text"], .customer-info input[type="date"]');
        customerInputs.forEach(input => {
            if (input.value.trim() === '') {
                // placeholder가 있고, input 값이 비어있다면 placeholder를 숨김
                // 또는 input에 placeholder 대신 빈 문자열을 넣어 이미지에 깔끔하게 나오도록 함
                input.setAttribute('data-placeholder-text', input.placeholder || ''); // 기존 placeholder 저장
                input.placeholder = ''; // placeholder 숨김
            }
        });

        // 캡처 직전에 테이블의 가로 스크롤바를 숨겨 전체 내용을 캡처하도록 함
        quotationContainer.style.overflowX = 'visible';

        // html2canvas를 사용하여 .quotation-container 전체를 이미지로 캡처
        html2canvas(quotationContainer, {
            scale: 2, // 2배 스케일로 고해상도 캡처
            scrollY: -window.scrollY, // 현재 스크롤 위치 보정
            useCORS: true,
            logging: true,
            allowTaint: true, // 이미지 로딩 문제 발생 시 시도 (보안 경고 발생 가능)
            backgroundColor: '#ffffff' // 배경색을 흰색으로 지정 (투명 영역 방지)
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
            // 캡처 후 원상 복구
            document.body.classList.remove('capture-mode');
            quotationContainer.style.overflowX = originalOverflowX; // 원래 overflow-x 상태 복구

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
    // ===========================================
    loadSavedLocations();

    const initialRows = quotationBody.querySelectorAll('.quotation-row');
    initialRows.forEach(setupRow);

    updateLocationNumbering();
});
