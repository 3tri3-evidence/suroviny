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
            const item = document.createElement('div');
            item.className = 'photo-item';
            
            const img = document.createElement('img');
            img.src = photoData;
            img.alt = `Surovina ${index + 1}`;
            item.appendChild(img);

            const actions = document.createElement('div');
            actions.className = 'photo-actions';

            // Tlačítko pro stažení konkrétní fotky do telefonu
            const dlBtn = document.createElement('button');
            dlBtn.className = 'photo-action-btn';
            dlBtn.innerHTML = '📥 Uložit';
            dlBtn.title = 'Uložit do telefonu';
            dlBtn.onclick = (e) => {
                e.stopPropagation();
                triggerDownload(photoData, `${order.name}_${index + 1}.jpg`);
            };
            actions.appendChild(dlBtn);

            // Tlačítko pro smazání fotky
            const delBtn = document.createElement('button');
            delBtn.className = 'photo-action-btn';
            delBtn.innerHTML = '❌';
            delBtn.title = 'Smazat fotografii';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Opravdu chcete tuto fotku smazat?')) {
                    order.photos.splice(index, 1);
                    saveData();
                    updateUIState();
                }
            };
            actions.appendChild(delBtn);

            item.appendChild(actions);
            photosContainer.appendChild(item);
        });
    }

    // Pomocná funkce pro vyvolání systémového stahování/uložení
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

    // Jakmile se vyfotí fotka, automaticky se uloží do aplikace A zároveň se vyvolá dotaz na uložení do telefonu
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

                    // AUTOMATICKÉ VYVOLÁNÍ ULOŽENÍ DO TELEFONU
                    const photoIndex = order.photos.length;
                    const safeName = order.name.replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ _-]/g, '_');
                    triggerDownload(photoBase64, `${safeName}_${photoIndex}.jpg`);
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
            folder.file(`surovina_${index + 1}.jpg`, base64Data, {base64: true});
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
