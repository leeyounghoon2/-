document.addEventListener('DOMContentLoaded', function() {
    const quotationTableBody = document.getElementById('quotationTableBody');
    const addRowBtn = document.getElementById('addRowBtn');
    const removeRowBtn = document.getElementById('removeRowBtn');
    const selectAllCheckbox = document.getElementById('selectAll');
    const totalFinalAmount = document.getElementById('totalFinalAmount');
    const completeBtn = document.getElementById('completeBtn');
    const quotationContainer = document.querySelector('.quotation-container');
    const customerContactInput = document.getElementById('customerContact');

    // 시공위치 자동 완성 데이터 (예시)
    const locations = [
        "안방", "작은방1", "작은방2", "거실", "주방", "베란다", "현관", "화장실"
    ];

    // 로컬 스토리지에서 시공위치 데이터 로드 (고유한 값만)
    let uniqueLocations = new Set(JSON.parse(localStorage.getItem('savedLocations') || '[]'));

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
    function addRow(locationValue = '', widthValue = '1000', heightValue = '1000', amountValue = '25,000', finalAmountValue = '25,000', optionChecked = false, remarksValue = '') {
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
        const amountInput = row.querySelector('.amount-input');
        const optionCheckbox = row.querySelector('.option-checkbox');
        const finalAmountInput = row.querySelector('.final-amount-input');
        const locationInput = row.querySelector('.location-input');
        const suggestionsDiv = row.querySelector('.suggestions');

        // 가로, 세로, 옵션 변경 시 최종 금액 및 총 합계 업데이트
        [widthInput, heightInput, optionCheckbox].forEach(input => {
            input.addEventListener('input', () => calculateAmounts(row));
            if (input.type === 'checkbox') {
                input.addEventListener('change', () => calculateAmounts(row));
            }
        });

        // 초기 계산
        calculateAmounts(row);

        // 시공위치 자동 완성 로직
        locationInput.addEventListener('input', function() {
            const inputVal = this.value.toLowerCase();
            suggestionsDiv.innerHTML = '';
            if (inputVal.length === 0) {
                suggestionsDiv.style.display = 'none';
                return;
            }

            const filteredSuggestions = Array.from(uniqueLocations).filter(loc =>
                loc.toLowerCase().includes(inputVal)
            ).slice(0, 5); // 최대 5개만 표시

            if (filteredSuggestions.length > 0) {
                filteredSuggestions.forEach(loc => {
                    const item = document.createElement('div');
                    item.classList.add('suggestion-item');
                    item.textContent = loc;
                    item.addEventListener('click', () => {
                        locationInput.value = loc;
                        suggestionsDiv.style.display = 'none';
                        // 새 위치가 입력되면 Set에 추가하여 저장
                        if (loc.trim() !== '' && !uniqueLocations.has(loc.trim())) {
                            uniqueLocations.add(loc.trim());
                            localStorage.setItem('savedLocations', JSON.stringify(Array.from(uniqueLocations)));
                        }
                    });
                    suggestionsDiv.appendChild(item);
                });
                suggestionsDiv.style.display = 'block';
            } else {
                suggestionsDiv.style.display = 'none';
            }
        });

        // 입력 필드에서 포커스 잃으면 자동 완성 닫기
        locationInput.addEventListener('blur', function() {
            // blur 이벤트가 suggestion-item 클릭보다 먼저 발생할 수 있으므로, 지연 시간을 줌
            setTimeout(() => {
                suggestionsDiv.style.display = 'none';
                // 새 위치가 입력되면 Set에 추가하여 저장 (blur 시점에도 저장)
                const locValue = locationInput.value.trim();
                if (locValue !== '' && !uniqueLocations.has(locValue)) {
                    uniqueLocations.add(locValue);
                    localStorage.setItem('savedLocations', JSON.stringify(Array.from(uniqueLocations)));
                }
            }, 100);
        });

        // 체크박스 변경 시 전체 선택/해제 체크박스 상태 업데이트
        row.querySelector('.row-checkbox').addEventListener('change', updateSelectAllCheckbox);
    }

    // 금액 계산 함수
    function calculateAmounts(row) {
        const width = parseInt(row.querySelector('.width-input').value) || 0;
        const height = parseInt(row.querySelector('.height-input').value) || 0;
        const optionChecked = row.querySelector('.option-checkbox').checked;
        const amountInput = row.querySelector('.amount-input');
        const finalAmountInput = row.querySelector('.final-amount-input');

        const basePricePerSqCm = 0.025; // 10x10=100cm2 당 25원 (0.25원/cm2) -> 0.0025원/mm2
        // 또는 1000x1000 = 1,000,000mm2 = 1m2 -> 25,000원
        // 단가: 25,000원 / 1,000,000 = 0.025원/mm2

        let calculatedAmount = Math.round((width * height) * basePricePerSqCm); // 소수점 반올림

        // 10000원 미만이면 10000원으로 고정 (최소 금액 10000원)
        if (calculatedAmount < 10000 && (width > 0 || height > 0)) {
            calculatedAmount = 10000;
        } else if (width === 0 && height === 0) { // 가로세로 0이면 금액도 0
            calculatedAmount = 0;
        }

        let finalAmount = calculatedAmount;
        if (optionChecked) {
            finalAmount += 5000; // 추가 옵션 5000원 추가
        }

        amountInput.value = calculatedAmount.toLocaleString() + '원';
        finalAmountInput.value = finalAmount.toLocaleString() + '원';
        updateTotal(); // 각 행의 최종 금액 변경 시 총 합계 업데이트
    }

    // 총 합계 업데이트 함수
    function updateTotal() {
        let total = 0;
        document.querySelectorAll('.final-amount-input').forEach(input => {
            const value = parseInt(input.value.replace(/[^0-9]/g, '')) || 0;
            total += value;
        });
        totalFinalAmount.textContent = total.toLocaleString() + '원';
    }

    // 전체 선택/해제 체크박스 상태 업데이트
    function updateSelectAllCheckbox() {
        const allCheckboxes = document.querySelectorAll('.row-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        selectAllCheckbox.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
    }

    // 초기 행 추가 (기본 1개 행)
    addRow();

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

    // 초기 총 합계 계산
    updateTotal();
});
