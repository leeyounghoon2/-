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
            const pricePerSqCm = 25000 / 300 / 300; // 30만원 / 90000cm^2
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

        // 자동 완성 기능 (추가된 부분)
        const locationInput = row.querySelector('.location-input');
        const suggestionsContainer = row.querySelector('.suggestions');

        locationInput.addEventListener('input', function() {
            const query = this.value;
            if (query.length > 0) {
                const savedLocations = getSavedLocations();
                const filteredSuggestions = savedLocations.filter(loc => loc.includes(query));
                renderSuggestions(suggestionsContainer, filteredSuggestions, this);
            } else {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
            }
        });

        locationInput.addEventListener('focus', function() {
            const query = this.value;
            if (query.length > 0) {
                const savedLocations = getSavedLocations();
                const filteredSuggestions = savedLocations.filter(loc => loc.includes(query));
                renderSuggestions(suggestionsContainer, filteredSuggestions, this);
            }
        });

        locationInput.addEventListener('blur', function(e) {
            // setTimeout으로 클릭 이벤트가 먼저 실행되도록 지연
            setTimeout(() => {
                if (!e.relatedTarget || !e.relatedTarget.classList.contains('suggestion-item')) {
                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'none';
                }
            }, 100);
        });

        function renderSuggestions(container, suggestions, input) {
            container.innerHTML = '';
            if (suggestions.length > 0) {
                suggestions.forEach(suggestion => {
                    const div = document.createElement('div');
                    div.classList.add('suggestion-item');
                    div.textContent = suggestion;
                    div.addEventListener('click', ()
