/* BLUEPRINT-JS-START */
// 🚀 Auto-generado para python: 5/24/2026, 2:44:18 PM

'use strict';

console.log('✅ 22 funciones y 14 clases detectadas');

// Funciones interactivas
function demo_products() {
    console.log('▶️ Ejecutando: products()');
    alert('Función products() ejecutada');
}

function demo_sales_daily() {
    console.log('▶️ Ejecutando: sales_daily()');
    alert('Función sales_daily() ejecutada');
}

function demo_inventory() {
    console.log('▶️ Ejecutando: inventory()');
    alert('Función inventory() ejecutada');
}

function demo_suppliers() {
    console.log('▶️ Ejecutando: suppliers()');
    alert('Función suppliers() ejecutada');
}

function demo_raw_materials() {
    console.log('▶️ Ejecutando: raw_materials()');
    alert('Función raw_materials() ejecutada');
}

function demo_bom() {
    console.log('▶️ Ejecutando: bom()');
    alert('Función bom() ejecutada');
}

function demo_health() {
    console.log('▶️ Ejecutando: health()');
    alert('Función health() ejecutada');
}

function demo_register() {
    console.log('▶️ Ejecutando: register()');
    alert('Función register() ejecutada');
}

function demo_login() {
    console.log('▶️ Ejecutando: login()');
    alert('Función login() ejecutada');
}

function demo_me() {
    console.log('▶️ Ejecutando: me()');
    alert('Función me() ejecutada');
}

function demo_list_products() {
    console.log('▶️ Ejecutando: list_products()');
    alert('Función list_products() ejecutada');
}

function demo_kpis() {
    console.log('▶️ Ejecutando: kpis()');
    alert('Función kpis() ejecutada');
}

function demo_forecast_predict() {
    console.log('▶️ Ejecutando: forecast_predict()');
    alert('Función forecast_predict() ejecutada');
}

function demo_inventory_optimize() {
    console.log('▶️ Ejecutando: inventory_optimize()');
    alert('Función inventory_optimize() ejecutada');
}

function demo_reports_list() {
    console.log('▶️ Ejecutando: reports_list()');
    alert('Función reports_list() ejecutada');
}

function demo_reports_download() {
    console.log('▶️ Ejecutando: reports_download()');
    alert('Función reports_download() ejecutada');
}

function demo_alerts_active() {
    console.log('▶️ Ejecutando: alerts_active()');
    alert('Función alerts_active() ejecutada');
}

function demo_heatmap_data() {
    console.log('▶️ Ejecutando: heatmap_data()');
    alert('Función heatmap_data() ejecutada');
}

function demo_mlops_metrics() {
    console.log('▶️ Ejecutando: mlops_metrics()');
    alert('Función mlops_metrics() ejecutada');
}

function demo_insights_generate() {
    console.log('▶️ Ejecutando: insights_generate()');
    alert('Función insights_generate() ejecutada');
}

function demo_insights_chat() {
    console.log('▶️ Ejecutando: insights_chat()');
    alert('Función insights_chat() ejecutada');
}

function demo_chat_endpoint() {
    console.log('▶️ Ejecutando: chat_endpoint()');
    alert('Función chat_endpoint() ejecutada');
}

// Clases detectadas
console.log('📦 Clase: DataStore');
console.log('📦 Clase: UserOut');
console.log('📦 Clase: RegisterRequest');
console.log('📦 Clase: LoginRequest');
console.log('📦 Clase: LoginResponse');
console.log('📦 Clase: KPIResponse');
console.log('📦 Clase: ForecastPredictRequest');
console.log('📦 Clase: ForecastPoint');
console.log('📦 Clase: ForecastPredictResponse');
console.log('📦 Clase: InventoryRecommendation');
console.log('📦 Clase: ReportItem');
console.log('📦 Clase: AlertItem');
console.log('📦 Clase: InsightsGeneratePayload');
console.log('📦 Clase: ChatPayload');

// 🛒 Lógica de Tienda Automática con MockServer
function addToCart(product, price) {
    const item = { 
        product, 
        price, 
        date: new Date().toLocaleString() 
    };
    
    if (window.MockServer) {
        MockServer.save('orders', item);
        console.log('📦 Pedido guardado:', item);
        
        // Disparar evento para actualizar historial
        window.dispatchEvent(new CustomEvent('orderUpdated'));
    } else {
        alert('¡' + product + ' añadido al carrito!');
    }
    updateCartUI();
}

function updateCartUI() {
    const badge = document.getElementById('cart-badge');
    if (badge && window.MockServer) {
        badge.innerText = MockServer.get('orders').length;
    }
}

console.log('🛍️ Sistema de Tienda Pro con Persistencia listo.');

// 📜 Sistema de Historial de Pedidos Automático
window.StoreHistory = {
    init() {
        console.log('📜 Historial de Tienda Activado');
        this.render();
        
        // Escuchar actualizaciones de pedidos
        window.addEventListener('orderUpdated', () => this.render());
        
        // También refrescar periódicamente o si cambia localStorage
        window.addEventListener('storage', () => this.render());
    },
    
    render() {
        const historyList = document.getElementById('order-history-list');
        if (!historyList || !window.MockServer) return;
        
        const orders = MockServer.get('orders').reverse(); // Ver los más nuevos primero
        
        if (orders.length === 0) {
            historyList.innerHTML = '<p style="color: #666; font-style: italic;">No hay pedidos registrados aún.</p>';
            return;
        }
        
        let html = '<table class="history-table">';
        html += '<thead><tr><th>Fecha</th><th>Producto</th><th>Precio</th><th>Acción</th></tr></thead>';
        html += '<tbody>';
        
        orders.forEach(order => {
            html += '<tr>';
            html += '<td>' + order.date + '</td>';
            html += '<td style="font-weight: bold;">' + order.product + '</td>';
            html += '<td style="color: #10b981; font-weight: bold;">' + order.price + '</td>';
            html += '<td><button class="btn-delete-sm" onclick="MockServer.delete(\'orders\', \'' + order.id_uuid + '\'); window.dispatchEvent(new CustomEvent(\'orderUpdated\'));">🗑️</button></td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        historyList.innerHTML = html;
        console.log('✅ Historial renderizado:', orders.length, 'pedidos');
    }
};

document.addEventListener('DOMContentLoaded', () => StoreHistory.init());

// 🧬 Servidor Universal de Datos (Multi-Use)
window.MockServer = {
    save(collection, data) {
        const items = JSON.parse(localStorage.getItem(collection) || '[]');
        items.push({ ...data, id_uuid: Math.random().toString(36).substr(2, 9) });
        localStorage.setItem(collection, JSON.stringify(items));
        console.log('📁 Guardado en ['+collection+']:', data);
        if (window.AdminConsole) AdminConsole.refresh();
    },
    get(collection) {
        return JSON.parse(localStorage.getItem(collection) || '[]');
    },
    delete(collection, id) {
        const items = this.get(collection).filter(i => i.id_uuid !== id);
        localStorage.setItem(collection, JSON.stringify(items));
        if (window.AdminConsole) AdminConsole.refresh();
    },
    clear(collection) {
        localStorage.removeItem(collection);
        if (window.AdminConsole) AdminConsole.refresh();
    }
};

// 🛠️ Consola de Administración Visual
window.AdminConsole = {
    isOpen: false,
    init() {
        const btn = document.createElement('div');
        btn.id = 'admin-btn'; btn.innerHTML = '🛠️';
        btn.onclick = () => this.toggle();
        document.body.appendChild(btn);

        const panel = document.createElement('div');
        panel.id = 'admin-panel';
        panel.innerHTML = '<h3>🛠️ Admin Console</h3><div id="admin-content"></div><button onclick="AdminConsole.toggle()">Cerrar</button>';
        document.body.appendChild(panel);
        this.refresh();
    },
    toggle() { 
        this.isOpen = !this.isOpen;
        document.getElementById('admin-panel').style.display = this.isOpen ? 'block' : 'none';
    },
    refresh() {
        const content = document.getElementById('admin-content');
        if (!content) return;
        let html = '';
        const collections = ['orders', 'highscores', 'logs', 'users'];
        collections.forEach(c => {
            const data = MockServer.get(c);
            if (data.length > 0) {
                html += '<h4>'+c.toUpperCase()+' ('+data.length+')</h4><table>';
                data.slice(-5).forEach(i => {
                    html += '<tr><td>'+JSON.stringify(i).substr(0,40)+'...</td><td><button onclick="MockServer.delete(\''+c+'\', \''+i.id_uuid+'\')">🗑️</button></td></tr>';
                });
                html += '</table>';
            }
        });
        content.innerHTML = html || '<p>Esperando datos...</p>';
    }
};
document.addEventListener('DOMContentLoaded', () => AdminConsole.init());

/* BLUEPRINT-JS-END */