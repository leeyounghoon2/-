document.addEventListener('DOMContentLoaded', function() {
    const quotationTableBody = document.getElementById('quotationTableBody');
    const addRowBtn = document.getElementById('addRowBtn');
    const removeRowBtn = document.getElementById('removeRowBtn');
    const selectAllCheckbox = document.getElementById('selectAll');
    const totalFinalAmount = document.getElementById('totalFinalAmount');
    const completeBtn = document.getElementById('completeBtn');
    const quotationContainer = document.querySelector('.quotation-container');
    const customerContactInput = document.getElementById('customerContact');

    // 시공위치 자동 완성 제안을 위한 Set (번호 없는 순수 이름만 저장)
    let savedBaseLocations = new Set(JSON.parse(localStorage.getItem('savedBaseLocations') || '[]'));

    // 오늘 날짜 기본 설정
    document.getElementById('quotationDate').valueAsDate = new Date();

    // 입력 필드에 초기 하이픈 적용
    if (customerContactInput.value) {
        customerContactInput.value = formatPhoneNumber(customerContactInput.value);
    }

    // 전화번호 입력 시 자동 하이픈 추가
    customerContactInput.addEventListener('input', function(e) {
        e.target.value = formatPhoneNumber(e.target.value);
    });

    function formatPhoneNumber(phoneNumber) {
        // 숫자만 남기고 모든 비숫자 문자 제거
        const cleaned = ('' + phoneNumber).replace(/\D/g, '');
        let formatted = cleaned;

        // 010으로 시작하는 11자리 번호 (가장 흔한 경우)
        if (cleaned.length === 11 && cleaned.startsWith('010')) {
            formatted = cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        }
        // 02로 시작하는 9-10자리 번호 (서울 지역번호)
        else if (cleaned.length >= 9 && cleaned.length <= 10 && cleaned.startsWith('02')) {
            if (cleaned.length === 9) { // 02-XXX-XXXX
                formatted = cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
            } else if (cleaned.length === 10) { // 02-XXXX-XXXX
                formatted = cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
            }
        }
        // 0XX로 시작하는 10자리 번호 (다른 지역번호)
        else if (cleaned.length === 10 && !cleaned.startsWith('010') && cleaned.startsWith('0')) {
            formatted = cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
        // 그 외 (예: 짧은 번호, 국제 번호 등은 포맷하지 않음)
        else {
            formatted = cleaned; // 포맷하지 않은 원본 반환
        }

        return formatted;
    }

    // 행 추가 함수
    // 기본값을 모두 빈 문자열로 변경
    function addRow(locationValue = '', widthValue = '', heightValue = '', amountValue = '', finalAmountValue = '', optionChecked = false, remarksValue = '') {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="checkbox" class="row-checkbox"></td>
            <td>
                <input type="text" class="location-input" placeholder="시공위치" value="${locationValue}">
                <div class="suggestions"></div>
            </td>
            <td><input type="number" class="width-input" value="${widthValue}"></td>
            <td><input type="number" class="height-input" value="${heightValue}"></td>
            <td><input type="text" class="amount-input" value="${amountValue}" readonly></td>
            <td><input type="checkbox" class="option-checkbox" ${optionChecked ? 'checked' : ''}></td>
            <td><input type="text" class="final-amount-input" value="${finalAmountValue}" readonly></td>
            <td><input type="text" class="remarks-input" placeholder="비고" value="${remarksValue}"></td>
        `;
        quotationTableBody.appendChild(newRow);
        attachEventListenersToRow(newRow); // 새 행에 이벤트 리스너 연결
        updateTotal(); // 총 합계 업데이트
    }

    // 새 행에 이벤트 리스너 연결
    function attachEventListenersToRow(row) {
        const widthInput = row.querySelector('.width-input');
        const heightInput = row.querySelector('.height-input');
        const optionCheckbox = row.querySelector('.option-checkbox'); // 옵션 체크박스도 여기서 가져옴
        const locationInput = row.querySelector('.location-input');
        const suggestionsDiv = row.querySelector('.suggestions');
        const rowCheckbox = row.querySelector('.row-checkbox'); // 해당 행의 체크박스

        // 가로, 세로, 옵션 변경 시 최종 금액 및 총 합계 업데이트
        [widthInput, heightInput].forEach(input => {
            if (input) { // input 요소가 존재하는지 확인
                input.addEventListener('input', () => calculateAmounts(row));
            }
        });
        if (optionCheckbox) { // optionCheckbox 요소가 존재하는지 확인
            optionCheckbox.addEventListener('change', () => calculateAmounts(row));
        }

        // 시공위치 입력 시 체크박스 자동 선택/해제 및 자동 완성 로직
        locationInput.addEventListener('input', function() {
            const inputVal = this.value.trim();
            suggestionsDiv.innerHTML = '';

            // 시공위치 입력 시 체크박스 자동 선택/해제
            if (inputVal.length > 0) {
                rowCheckbox.checked = true;
            } else {
                rowCheckbox.checked = false;
            }
            updateSelectAllCheckbox(); // 전체 선택 체크박스 상태 업데이트

            if (inputVal.length === 0) {
                suggestionsDiv.style.display = 'none';
                return;
            }

            // 자동 완성 제안 (번호 없는 순수 이름 기반)
            const filteredSuggestions = Array.from(savedBaseLocations).filter(loc =>
                loc.toLowerCase().includes(inputVal.toLowerCase())
            ).slice(0, 5); // 최대 5개만 표시

            if (filteredSuggestions.length > 0) {
                filteredSuggestions.forEach(loc => {
                    const item = document.createElement('div');
                    item.classList.add('suggestion-item');
                    item.textContent = loc;
                    item.addEventListener('click', () => {
                        locationInput.value = loc; // 기본 제안 클릭 시 번호 없이 적용
                        suggestionsDiv.style.display = 'none';
                        // 새 위치가 입력되면 Set에 추가하여 저장
                        if (loc.trim() !== '' && !savedBaseLocations.has(loc.trim())) {
                            savedBaseLocations.add(loc.trim());
                            localStorage.setItem('savedBaseLocations', JSON.stringify(Array.from(savedBaseLocations)));
                        }
                        // 클릭 시에도 체크박스 상태 업데이트 (이미 input 이벤트에서 처리되지만 안전장치)
                        rowCheckbox.checked = true;
                        updateSelectAllCheckbox();
                        locationInput.focus(); // 클릭 후 다시 포커스하여 사용자 편의성 증대
                    });
                    suggestionsDiv.appendChild(item);
                });
                suggestionsDiv.style.display = 'block';
            } else {
                suggestionsDiv.style.display = 'none';
            }
        });

        // 입력 필드에서 포커스 잃으면 자동 완성 닫기 및 번호 자동 부여
        locationInput.addEventListener('blur', function() {
            // blur 이벤트가 suggestion-item 클릭보다 먼저 발생할 수 있으므로, 지연 시간을 줌
            setTimeout(() => {
                suggestionsDiv.style.display = 'none';
                let locValue = locationInput.value.trim();

                if (locValue !== '') {
                    // 숫자와 하이픈 제거 후 순수 이름 추출 (예: "거실1-1" -> "거실")
                    // 정규식 수정: 숫자와 하이픈으로 끝나는 부분만 제거
                    const baseNameMatch = locValue.match(/^([가-힣a-zA-Z]+)/);
                    let baseName = locValue; // 기본값은 전체 입력값
                    if (baseNameMatch && baseNameMatch[1]) {
                        baseName = baseNameMatch[1]; // "거실1-1" -> "거실", "안방" -> "안방"
                    }

                    // 저장된 기본 위치 목록에 추가
                    if (baseName !== '' && !savedBaseLocations.has(baseName)) {
                        savedBaseLocations.add(baseName);
                        localStorage.setItem('savedBaseLocations', JSON.stringify(Array.from(savedBaseLocations)));
                    }

                    // 현재 문서에서 해당 baseName으로 시작하는 항목의 최대 번호 찾기
                    let maxNum = 0;
                    document.querySelectorAll('.location-input').forEach(existingInput => {
                        if (existingInput === locationInput) return; // 자기 자신은 제외

                        const existingVal = existingInput.value.trim();
                        // 기존 값에서 순수 이름만 추출
                        const existingBaseNameMatch = existingVal.match(/^([가-힣a-zA-Z]+)/);
                        let existingBaseName = existingVal;
                        if (existingBaseNameMatch && existingBaseNameMatch[1]) {
                            existingBaseName = existingBaseNameMatch[1];
                        }

                        // 순수 이름이 일치하는 경우에만 번호 검사
                        if (existingBaseName === baseName) {
                            const numPart = existingVal.substring(baseName.length); // 예: "거실1-1"에서 "1-1"
                            const firstNumMatch = numPart.match(/^\d+/); // 시작하는 숫자만
                            if (firstNumMatch) {
                                const currentNum = parseInt(firstNumMatch[0]);
                                if (!isNaN(currentNum) && currentNum > maxNum) {
                                    maxNum = currentNum;
                                }
                            }
                        }
                    });

                    // 현재 입력된 값에 이미 숫자가 포함되어 있는지 확인
                    const currentInputHasNumber = locValue.substring(baseName.length).match(/^\d+/);

                    // 현재 입력된 값이 '순수 이름'이고, 동일한 '순수 이름'의 다른 항목이 이미 있다면 번호 부여
                    if (locValue === baseName && maxNum >= 1) { // '거실' 입력 -> '거실1' 또는 '거실2'
                        locationInput.value = `${baseName}${maxNum + 1}`;
                    } else if (locValue === baseName && maxNum === 0 && !currentInputHasNumber) {
                        // '거실'만 입력했고, 다른 '거실' 항목이 전혀 없다면 '거실1'로
                        locationInput.value = `${baseName}1`;
                    }
                    // 그 외 (예: '거실1'을 직접 입력했거나, '새로운방'을 입력한 경우)는 그대로 유지
                }

                // blur 시에도 체크박스 상태 업데이트
                if (locationInput.value.trim().length > 0) {
                    rowCheckbox.checked = true;
                } else {
                    rowCheckbox.checked = false;
                }
                updateSelectAllCheckbox();

            }, 100);
        });

        // 체크박스 변경 시 전체 선택/해제 체크박스 상태 업데이트
        row.querySelector('.row-checkbox').addEventListener('change', updateSelectAllCheckbox);
    }

    // 금액 계산 함수
    function calculateAmounts(row) {
        const width = parseInt(row.querySelector('.width-input').value) || 0;
        const height = parseInt(row.querySelector('.height-input').value) || 0;
        const optionCheckbox = row.querySelector('.option-checkbox'); // 옵션 체크박스 직접 가져오기
        const optionChecked = optionCheckbox ? optionCheckbox.checked : false; // 옵션 체크박스가 없으면 false
        const amountInput = row.querySelector('.amount-input');
        const finalAmountInput = row.querySelector('.final-amount-input');

        // 요소들이 존재하는지 다시 한번 확인 (방어 코드)
        if (!amountInput || !finalAmountInput) {
            console.error('금액 입력 필드를 찾을 수 없습니다.');
            return;
        }

        let calculatedAmount = 0;
        const baseUnitPrice = 25; // 기본 단가 25원
        const minPrice = 25000; // 최소 금액 25,000원

        // 가로, 세로 둘 다 0이거나 유효하지 않은 숫자이면 금액 관련 필드를 빈칸으로
        if (width === 0 && height === 0) {
            amountInput.value = '';
            finalAmountInput.value = '';
            updateTotal();
            return; // 함수 종료
        }

        const maxLength = Math.max(width, height); // 가로, 세로 중 긴 값
        const minLength = Math.min(width, height); // 가로, 세로 중 짧은 값

        // 기본 계산: 긴 길이 * 기본 단가
        calculatedAmount = maxLength * baseUnitPrice;

        // 짧은 길이에 따른 가중치 적용: (짧은 길이 / 1000)을 곱함
        // 예: 1000mm -> 1.0, 1100mm -> 1.1, 1200mm -> 1.2
        if (minLength > 0) {
            calculatedAmount = calculatedAmount * (minLength / 1000);
        }
        calculatedAmount = Math.round(calculatedAmount); // 반올림

        // 최소 금액 25,000원 적용
        if (calculatedAmount < minPrice) {
            calculatedAmount = minPrice;
        }

        // '금액' 칸에는 추가 옵션이 적용되기 전의 순수 계산 금액 표시
        amountInput.value = calculatedAmount.toLocaleString() + '원';

        // '최종금액' 칸은 추가 옵션 적용 여부에 따라 변경
        let finalAmount = calculatedAmount;
        if (optionChecked) {
            finalAmount += 5000; // 추가 옵션 5000원 추가
        }
        finalAmountInput.value = finalAmount.toLocaleString() + '원';

        updateTotal(); // 각 행의 최종 금액 변경 시 총 합계 업데이트
    }

    // 총 합계 업데이트 함수
    function updateTotal() {
        let total = 0;
        document.querySelectorAll('.final-amount-input').forEach(input => {
            // 빈 문자열이거나 숫자가 아닌 경우 0으로 처리
            const value = parseInt(input.value.replace(/[^0-9]/g, '')) || 0;
            total += value;
        });
        totalFinalAmount.textContent = total.toLocaleString() + '원';
    }

    // 전체 선택/해제 체크박스 상태 업데이트
    function updateSelectAllCheckbox() {
        const allCheckboxes = document.querySelectorAll('.row-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        
        if (allCheckboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.disabled = true; // 체크박스 비활성화
        } else {
            selectAllCheckbox.disabled = false; // 체크박스 활성화
            selectAllCheckbox.checked = allCheckboxes.length === checkedCheckboxes.length;
        }
    }

    // 초기 로드 시 기존 HTML 행에 이벤트 리스너 부착
    document.querySelectorAll('#quotationTableBody tr').forEach(row => {
        attachEventListenersToRow(row);
    });


    // 행 추가 버튼 클릭 이벤트
    addRowBtn.addEventListener('click', () => addRow());

    // 행 삭제 버튼 클릭 이벤트
    removeRowBtn.addEventListener('click', () => {
        const checkedRows = document.querySelectorAll('.row-checkbox:checked');
        if (checkedRows.length === 0) {
            alert('삭제할 행을 선택해주세요.');
            return;
        }
        if (confirm(`${checkedRows.length}개의 행을 삭제하시겠습니까?`)) {
            checkedRows.forEach(checkbox => {
                checkbox.closest('tr').remove();
            });
            updateTotal(); // 총 합계 업데이트
            updateSelectAllCheckbox(); // 전체 선택 체크박스 상태 업데이트
        }
    });

    // 전체 선택/해제 체크박스 클릭 이벤트
    selectAllCheckbox.addEventListener('change', function() {
        document.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        updateTotal(); // 체크박스 변경 시 총 합계도 업데이트 (선택된 행만 반영되는 것은 아니지만, 일관성을 위해 호출)
    });

    // '완료' 버튼 클릭 시 JPG 저장
    completeBtn.addEventListener('click', function() {
        // 캡처 모드 클래스 추가 (placeholder 숨기기 등)
        document.body.classList.add('capture-mode');

        // 고객 정보 필드와 시공위치, 비고 필드의 placeholder를 숨기기
        const allInputs = document.querySelectorAll('input[placeholder]');
        allInputs.forEach(input => {
            input.dataset.placeholder = input.placeholder; // 원래 placeholder 저장
            input.placeholder = ''; // placeholder 비우기
        });

        html2canvas(quotationContainer, {
            scale: 2, // 고해상도 캡처를 위해 스케일 증가
            useCORS: true // 외부 이미지(CDN 등) 사용 시 필요
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', 0.9); // JPG로 변환, 품질 0.9

            const link = document.createElement('a');
            const now = new Date();
            const filename = `견적서_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.jpg`;
            
            link.download = filename;
            link.href = imgData;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 캡처 모드 클래스 제거 (placeholder 원상 복구)
            document.body.classList.remove('capture-mode');
            allInputs.forEach(input => {
                input.placeholder = input.dataset.placeholder || ''; // 원래 placeholder 복원
            });
        }).catch(error => {
            console.error('oops, something went wrong!', error);
            alert('견적서 이미지 저장에 실패했습니다. 콘솔을 확인해주세요.');
            // 오류 발생 시에도 클래스 제거 및 placeholder 복원
            document.body.classList.remove('capture-mode');
            allInputs.forEach(input => {
                input.placeholder = input.dataset.placeholder || '';
            });
        });
    });

    // 페이지 로드 시 기존 HTML 행 및 총 합계 업데이트
    updateTotal();
    updateSelectAllCheckbox(); // 초기 체크박스 상태 업데이트
});
