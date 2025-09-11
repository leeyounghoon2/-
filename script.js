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
    // 견적 목록 추가/제거 및 계산 기능
    // ===========================================
    function setupRow(row) {
        const widthInput = row.querySelector('.width-input');
        const heightInput = row.querySelector('.height-input');
        const optionCheckbox = row.querySelector('.option-checkbox');
        const finalAmountCell = row.querySelector('.final-amount-cell');

        function updateFinalAmount() {
            const width = parseFloat(widthInput.value) || 0;
            const height = parseFloat(heightInput.value) || 0;
            const pricePerSqCm = 25000 / 300 / 300;
            let finalAmount = width * height * pricePerSqCm;
            
            if (optionCheckbox.checked) {
                finalAmount += 30000;
            }
            
            finalAmountCell.textContent = Math.round(finalAmount).toLocaleString() + '원';
            calculateTotalAmount();
        }

        widthInput.addEventListener('input', updateFinalAmount);
        heightInput.addEventListener('input', updateFinalAmount);
        optionCheckbox.addEventListener('change', updateFinalAmount);
    }

    function calculateTotalAmount() {
        const rows = quotationBody.querySelectorAll('.quotation-row');
        let total = 0;
        rows.forEach(row => {
            const finalAmountCell = row.querySelector('.final-amount-cell');
            if (finalAmountCell) {
                const amountText = finalAmountCell.textContent;
                const amount = parseInt(amountText.replace(/[^0-9]/g, '')) || 0;
                total += amount;
            }
        });
        totalFinalAmountCell.textContent = total.toLocaleString() + '원';
    }

    function addRow() {
        const newRow = document.createElement('tr');
        newRow.classList.add('quotation-row');
        newRow.innerHTML = `
            <td><input type="checkbox" class="check-item"></td>
            <td><input type="text" class="location-input"></td>
            <td><input type="number" class="width-input" step="100"></td>
            <td><input type="number" class="height-input" step="100"></td>
            <td><input type="checkbox" class="option-checkbox"></td>
            <td class="final-amount-cell"></td>
            <td><input type="text" class="remarks-input"></td>
        `;
        quotationBody.appendChild(newRow);
        setupRow(newRow);
    }

    function removeRow() {
        const checkedItems = quotationBody.querySelectorAll('.check-item:checked');
        if (checkedItems.length > 0) {
            checkedItems.forEach(item => {
                item.closest('.quotation-row').remove();
            });
            calculateTotalAmount();
        } else {
            alert('삭제할 항목을 선택해주세요.');
        }
    }

    addRowBtn.addEventListener('click', addRow);
    removeRowBtn.addEventListener('click', removeRow);

    // ===========================================
    // 이미지 저장 기능 (핵심 수정 부분)
    // ===========================================
    completeBtn.addEventListener('click', function() {
        const customerInputs = document.querySelectorAll('.customer-info input[type="text"]');
        
        // 캡처 전에 input의 placeholder 텍스트를 data- 속성에 임시 저장
        customerInputs.forEach(input => {
            if (input.placeholder) {
                input.setAttribute('data-placeholder-text', input.placeholder);
                input.placeholder = ''; // placeholder 숨기기
            }
        });

        const quotationContainer = document.querySelector('.quotation-container');
        const originalOverflowX = quotationContainer.style.overflowX;

        // 캡처 모드 클래스 추가
        document.body.classList.add('capture-mode');
        quotationContainer.style.overflowX = 'visible';

        // 이미지 품질 향상을 위한 html2canvas 옵션 설정
        const options = {
            scale: 2, // 렌더링 해상도를 2배로 높여서 글자 깨짐 현상 방지
            useCORS: true,
            logging: true,
        };

        html2canvas(document.body, options).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/jpeg', 1.0);

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

            // 캡처 후 원래 placeholder 텍스트 복원
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
    const initialRows = quotationBody.querySelectorAll('.quotation-row');
    initialRows.forEach(setupRow);
});
