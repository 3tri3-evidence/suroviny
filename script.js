document.addEventListener('DOMContentLoaded', () => {
    let orders = JSON.parse(localStorage.getItem('cukrarna_orders')) || [];
    
    const selectOrder = document.getElementById('active-order');
    const inputNewOrderName = document.getElementById('new-order-name');
    const btnAddOrder = document.getElementById('btn-add-order');
    const inputOrderDate = document.getElementById('order-date');
    const btnTakePhoto = document.getElementById('btn-take-photo');
    const cameraInput = document.getElementById('camera-input');
    const photosContainer = document.getElementById('photos-container');
    const photoCountBadge = document.getElementById('photo-count');
    const btnExport = document.getElementById('btn-export');
    const btnDelete = document.getElementById('btn-delete');

    // Prvky pro modální okno náhledu
    const photoModal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modal-img');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    const todayStr = new Date().toISOString().split('T')[0];
    inputOrderDate.value = todayStr;

    function saveData() {
        localStorage.setItem('cukrarna_orders', JSON.stringify(orders));
    }

    function renderOrders() {
        const currentSelectedId = selectOrder.value;
        selectOrder.innerHTML = '<option value="">-- Vyberte zakázku --</option>';
        
        orders.forEach(order => {
            const option = document.createElement('option');
            option.value = order.id;
            option.textContent = `${order.name} (${order.date})`;
            selectOrder.appendChild(option);
        });

        if (currentSelectedId && orders.some(o => o.id == currentSelectedId)) {
            selectOrder.value = currentSelectedId;
        }
        
        updateUIState();
    }

    function updateUIState() {
        const activeOrderId = selectOrder.value;
        const hasOrder = activeOrderId !== "";
        
        btnTakePhoto.disabled = !hasOrder;
        btnExport.disabled = !hasOrder;
        btnDelete.disabled = !hasOrder;

        if (!hasOrder) {
            photosContainer.innerHTML = '<p class="empty-text">Vyber zakázku a pořiď první fotografii.</p>';
            photoCountBadge.textContent = '0 fotografií';
            return;
        }

        const order = orders.find(o => o.id == activeOrderId);
        if (!order) return;

        const count = order.photos.length;
        photoCountBadge.textContent = `${count} ${count === 1 ? 'fotografie' : count > 1 && count < 5 ? 'fotografie' : 'fotografií'}`;

        if (count === 0) {
            photosContainer.innerHTML = '<p class="empty-text">Zatím žádné fotky. Klikněte na Vyfotit surovinu.</p>';
            return;
        }

        photosContainer.innerHTML = '';

        order.photos.forEach((photoData, index) => {
            const fileName = `00${index + 1}.jpg`;

            const card = document.createElement('div');
            card.className = 'photo-card';

            // Kliknutelná miniatura pro otevření fotky přes celou obrazovku jedním klepnutím
            const thumbContainer = document.createElement('div');
            thumbContainer.className = 'photo-thumb-container';
            thumbContainer.onclick = () => {
                modalImg.src = photoData;
                photoModal.style.display = 'flex';
            };

            const img = document.createElement('img');
            img.src = photoData;
            img.alt = fileName;
            thumbContainer.appendChild(img);
            card.appendChild(thumbContainer);

            // Spodní lišta s názvem a tlačítkem pro smazání
            const info = document.createElement('div');
            info.className = 'photo-info';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'photo-name';
            nameSpan.textContent = fileName;
            info.appendChild(nameSpan);

            const delBtn = document.createElement('button');
            delBtn.className = 'photo-del-btn';
            delBtn.innerHTML = '🗑️';
            delBtn.title = 'Smazat fotografii';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Opravdu chcete tuto fotku smazat?')) {
                    order.photos.splice(index, 1);
                    saveData();
                    updateUIState();
                }
            };
            info.appendChild(delBtn);

            card.appendChild(info);
            photosContainer.appendChild(card);
        });
    }

    // Zavření modálního okna
    modalCloseBtn.onclick = () => {
        photoModal.style.display = 'none';
    };
    photoModal.onclick = (e) => {
        if (e.target === photoModal) {
            photoModal.style.display = 'none';
        }
    };

    function triggerDownload(dataUrl, filename) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    btnAddOrder.addEventListener('click', () => {
        const name = inputNewOrderName.value.trim();
        const date = inputOrderDate.value;

        if (!name) {
            alert('Zadejte prosím název zakázky.');
            return;
        }

        const newOrder = {
            id: Date.now(),
            name: name,
            date: date || todayStr,
            photos: []
        };

        orders.push(newOrder);
        saveData();
        inputNewOrderName.value = '';
        renderOrders();
        selectOrder.value = newOrder.id;
        updateUIState();
    });

    selectOrder.addEventListener('change', updateUIState);

    btnTakePhoto.addEventListener('click', () => {
        if (cameraInput) {
            cameraInput.click();
        }
    });

    if (cameraInput) {
        cameraInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                const activeOrderId = selectOrder.value;
                const order = orders.find(o => o.id == activeOrderId);
                if (order) {
                    const photoBase64 = event.target.result;
                    order.photos.push(photoBase64);
                    saveData();
                    updateUIState();

                    // Pokus o automatické vyvolání systémového stažení souboru do telefonu
                    const photoIndex = order.photos.length;
                    const safeName = order.name.replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ _-]/g, '_');
                    triggerDownload(photoBase64, `${safeName}_00${photoIndex}.jpg`);
                }
                cameraInput.value = '';
            };
            reader.readAsDataURL(file);
        });
    }

    btnDelete.addEventListener('click', () => {
        const activeOrderId = selectOrder.value;
        if (!activeOrderId) return;

        if (confirm('Opravdu chcete smazat celou zakázku včetně všech fotografií?')) {
            orders = orders.filter(o => o.id != activeOrderId);
            saveData();
            renderOrders();
        }
    });

    btnExport.addEventListener('click', async () => {
        const activeOrderId = selectOrder.value;
        const order = orders.find(o => o.id == activeOrderId);
        if (!order || order.photos.length === 0) {
            alert('Zakázka neobsahuje žádné fotografie k exportu.');
            return;
        }

        const zip = new JSZip();
        const folderName = order.name.replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ _-]/g, '_');
        const folder = zip.folder(folderName);

        order.photos.forEach((photoBase64, index) => {
            const base64Data = photoBase64.split(',')[1];
            folder.file(`00${index + 1}.jpg`, base64Data, {base64: true});
        });

        try {
            const content = await zip.generateAsync({type: 'blob'});
            const url = URL.createObjectURL(content);
            triggerDownload(url, `${folderName}.zip`);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            alert('Chyba při vytváření ZIP archivu.');
            console.error(err);
        }
    });

    renderOrders();
});
