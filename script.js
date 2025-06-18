document.addEventListener('DOMContentLoaded', function() {
    const quotationBody = document.getElementById('quotationBody');
    const addRowBtn = document.getElementById('addRowBtn');
    const removeRowBtn = document.getElementById('removeRowBtn');
    const totalFinalAmountCell = document.getElementById('totalFinalAmount');
    const completeBtn = document.getElementById('completeBtn'); // 완료 버튼

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

        suggestionBox.innerHTML = ''; // 이전 제안 지우기
        suggestionBox.style.display = 'block';

        let hasSuggestions = false;
        Array.from(savedLocations).forEach(location => {
            if (location.toLowerCase().includes(searchTerm)) {
                const suggestionItem = document.createElement('div');
                suggestionItem.textContent = location;
                suggestionItem.className = 'suggestion-item';
                // mousedown 이벤트 사용: input의 blur 이벤트보다 먼저 발생하여 제안 클릭 시 입력창이 사라지지 않도록 함
                suggestionItem.addEventListener('mousedown', function(e) {
                    e.preventDefault(); // 기본 mousedown 동작(blur) 방지
                    inputElement.value = location;
                    suggestionBox.style.display = 'none';
                    updateLocationNumbering(); // 제안 선택 후 번호 매기기 업데이트
                    inputElement.focus(); // 입력창에 포커스 유지
                });
                suggestionBox.appendChild(suggestionItem);
                hasSuggestions = true;
            }
        });

        if (!hasSuggestions || searchTerm === '') {
            suggestionBox.style.display = 'none'; // 일치하는 항목이 없거나 입력창이 비어있으면 숨김
        }
    }

    // 자동 완성 제안 목록 숨기기
    function hideSuggestions(inputElement) {
        const parentTd = inputElement.closest('td');
        const suggestionBox = parentTd.querySelector('.suggestions');
        if (suggestionBox) {
            // 제안 클릭 이벤트가 먼저 처리될 수 있도록 약간의 지연
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
        const baseLocationOccurrences = new Map(); // Map: 기본 위치 이름 -> 해당 입력 요소들의 배열

        // 첫 번째 순회: 모든 입력 요소에서 기본 위치 이름(번호 제외)을 추출하고 저장
        locationInputs.forEach(input => {
            const fullValue = input.value.trim();
            if (fullValue === '') return;

            // 정규식을 사용하여 기존 번호 부분을 제거하고 기본 위치 이름만 추출
            // 예: "거실 1-1" -> "거실", "침실1" -> "침실"
            const baseName = fullValue.replace(/( \d+-\d+|\s?\d+)$/, '').trim();

            // 기본 위치 이름을 저장된 위치 목록(자동 완성용)에 추가
            addLocationToSaved(baseName || fullValue); // baseName이 비어있으면 (예: 숫자만 입력된 경우) 전체 값을 사용

            const effectiveBaseName = baseName || fullValue; // 번호가 제거된 이름이 없으면 전체 값 사용

            if (!baseLocationOccurrences.has(effectiveBaseName)) {
                baseLocationOccurrences.set(effectiveBaseName, []);
            }
            baseLocationOccurrences.get(effectiveBaseName).push(input);
        });

        // 두 번째 순회: 각 기본 위치 이름에 대해 번호를 부여하고 입력 요소에 적용
        baseLocationOccurrences.forEach((inputsForBase, baseName) => {
            let defaultCount = 0;   // "침실1", "안방2" 같은 기본 형식 카운터
            let livingRoomCount = 0; // "거실 1-1", "거실 1-2" 같은 거실 전용 카운터

            inputsForBase.forEach(input => {
                let newValue = input.value; // 변경될 새로운 값

                if (baseName === '거실') {
                    livingRoomCount++;
                    newValue = `${baseName} 1-${livingRoomCount}`;
                } else if (baseName) { // 기본 이름이 있는 경우에만 번호 매김
                    defaultCount++;
                    newValue = `${baseName}${defaultCount}`;
                }

                // 입력 값에 변경이 있을 경우에만 업데이트하여 불필요한 이벤트 트리거 방지
                if (input.value !== newValue) {
                    input.value = newValue;
                    // 값 변경 후 'input' 이벤트를 수동으로 발생시켜 다른 리스너들(예: 금액 계산)이 작동하도록 함
                    const event = new Event('input', { bubbles: true });
                    input.dispatchEvent(event);
                }
            });
        });
        updateTotalSum(); // 모든 번호 매기기가 완료된 후 총 합계 업데이트
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

        // 해당 행의 금액을 업데이트하는 함수
        function updateAmountsAndTotal() {
            let baseAmount = 0;

            if (checkItem.checked) {
                const width = parseFloat(widthInput.value) || 0;
                const height = parseFloat(heightInput.value) || 0;

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

            updateTotalSum(); // 이 행의 금액 변경 시 전체 합계 업데이트
        }

        // --- 이벤트 리스너 설정 ---

        // '시공위치' 입력 필드 이벤트
        locationInput.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                checkItem.checked = true; // 값이 있으면 체크박스 자동 체크
                showSuggestions(this); // 입력 시 제안 목록 표시
            } else {
                checkItem.checked = false; // 값이 없으면 체크박스 해제
                hideSuggestions(this); // 비어있으면 제안 목록 숨김
            }
            // 금액 계산은 번호 매기기 함수 (updateLocationNumbering)가 값 변경 후 트리거할 것임
        });

        locationInput.addEventListener('focus', function() {
            showSuggestions(this); // 포커스 시 제안 목록 표시
        });

        locationInput.addEventListener('blur', function() {
            hideSuggestions(this); // 포커스 잃으면 제안 목록 숨김 (딜레이 있음)

            // 값이 있을 때만 번호 매기기 및 저장 로직 실행
            if (this.value.trim() !== '') {
                // 현재 입력된 값의 기본 이름을 추출하여 저장 목록에 추가
                const currentBaseName = this.value.replace(/( \d+-\d+|\s?\d+)$/, '').trim();
                addLocationToSaved(currentBaseName || this.value.trim());
                updateLocationNumbering(); // 모든 행의 번호 다시 매기기
            } else {
                // 비어있으면 체크박스 해제 및 금액 클리어
                checkItem.checked = false;
                updateAmountsAndTotal();
            }
        });

        // '체크' 박스, '가로', '세로', '추가옵션' 변경 시 금액 업데이트
        checkItem.addEventListener('change', updateAmountsAndTotal);
        widthInput.addEventListener('input', updateAmountsAndTotal);
        heightInput.addEventListener('input', updateAmountsAndTotal);
        optionCheckbox.addEventListener('change', updateAmountsAndTotal);

        // 초기 로드 시 '시공위치'에 값이 있다면 '체크'박스 자동 체크
        if (locationInput.value.trim() !== '') {
            checkItem.checked = true;
        }
        // updateAmountsAndTotal() 호출은 updateLocationNumbering에서 최종적으로 처리
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
        updateLocationNumbering(); // 모든 행의 번호 다시 매기기 (새 행 포함)
    });

    // 행 제거 버튼 클릭 이벤트
    removeRowBtn.addEventListener('click', function() {
        const allRows = quotationBody.querySelectorAll('.quotation-row');
        const checkedCheckboxes = quotationBody.querySelectorAll('.check-item:checked');
        let rowsToDelete = [];

        if (checkedCheckboxes.length > 0) {
            // 체크된 항목이 있으면 해당 행들을 삭제 목록에 추가
            checkedCheckboxes.forEach(checkbox => {
                const row = checkbox.closest('tr.quotation-row');
                if (row) {
                    rowsToDelete.push(row);
                }
            });
        } else {
            // 체크된 항목이 없으면 마지막 행을 삭제 목록에 추가
            if (allRows.length > 0) {
                rowsToDelete.push(allRows[allRows.length - 1]);
            }
        }

        // 삭제할 행이 있는지 확인하고, 최소 한 개는 남도록 처리
        if (rowsToDelete.length === 0 || allRows.length - rowsToDelete.length < 1) {
            alert('더 이상 행을 제거할 수 없습니다. 최소 한 개의 행은 유지됩니다.');
            return;
        }

        // 삭제 목록에 있는 행들을 DOM에서 제거
        rowsToDelete.forEach(row => {
            if (row.parentNode) {
                row.parentNode.removeChild(row);
            }
        });

        // 삭제 후 모든 행의 번호 다시 매기기 및 총 합계 업데이트
        updateLocationNumbering();
    });

    // ===========================================
    // 완료 버튼 (JPG 저장) 기능
    // ===========================================
    completeBtn.addEventListener('click', function() {
        const quotationContainer = document.querySelector('.quotation-container');

        // html2canvas를 사용하여 .quotation-container 요소를 캡처
        html2canvas(quotationContainer, {
            scale: 2, // 고해상도 이미지 생성을 위해 스케일 조정 (선택 사항)
            logging: false, // 콘솔 로그 비활성화
            useCORS: true // CORS 문제 발생 시
        }).then(function(canvas) {
            // 캡처된 캔버스를 이미지 데이터 URL로 변환
            const imageDataURL = canvas.toDataURL('image/jpeg', 0.9); // JPEG 형식, 품질 0.9

            // 파일 이름 생성 (예: quotation_2023-10-27.jpg)
            const date = new Date();
            const filename = `견적서_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.jpg`;

            // 다운로드 링크 생성
            const a = document.createElement('a');
            a.href = imageDataURL;
            a.download = filename; // 다운로드될 파일 이름 설정

            // 링크를 클릭하여 다운로드 시작
            document.body.appendChild(a); // 일부 브라우저에서 필요
            a.click();
            document.body.removeChild(a); // 사용 후 제거
        }).catch(function(error) {
            console.error('이미지 저장 중 오류 발생:', error);
            alert('견적서 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
        });
    });


    // ===========================================
    // 초기 설정 (페이지 로드 시)
    // ===========================================
    loadSavedLocations(); // 페이지 로드 시 저장된 위치 목록 불러오기

    const initialRows = quotationBody.querySelectorAll('.quotation-row');
    initialRows.forEach(setupRow); // 기존 HTML 행에 기능 설정

    updateLocationNumbering(); // 초기 로드 시 모든 행의 번호 매기기 적용
    // updateTotalSum()은 updateLocationNumbering 내부에서 호출됨
});