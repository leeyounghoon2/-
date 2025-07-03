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
            <td><input type="text" class="final
