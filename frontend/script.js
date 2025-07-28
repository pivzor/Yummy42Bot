const tg = window.Telegram.WebApp;
tg.expand();

const menu = [
    { 
        id: 1, 
        name: "Бургер", 
        price: 350,
        image: "/frontend/picture/burger.png",
        modifiers: [
            { id: 101, name: "Дополнительный сыр", price: 50 },
            { id: 102, name: "Бекон", price: 80 },
            { id: 103, name: "Острый соус", price: 30 },
            
        ]
    },
    { 
        id: 2, 
        name: "Картошка", 
        price: 150,
        image: "/frontend/picture/potato.png",
        modifiers: [
            { id: 201, name: "С сыром", price: 70 },
            { id: 202, name: "Со сметаной", price: 40 }
        ]
    },
    { 
        id: 3, 
        name: "Кола", 
        price: 100,
        image: "/frontend/picture/cola.png",
        modifiers: [
            { id: 301, name: "Большой стакан", price: 30 },
            { id: 302, name: "Со льдом", price: 0 }
        ]
    }
];

const cart = [];
let currentItem = null;

function displayMenu() {
    document.getElementById('menu').innerHTML = menu.map(item => `
        <div class="item">
            <img src="${item.image}" alt="${item.name}" class="item-image">
            <h3>${item.name}</h3>
            <p>Цена: ${item.price} ₽</p>
            <button class="button-add" onclick="addToCart(${item.id})">Добавить</button>
            
            <button class="button-detail" onclick="showItemDetail(${item.id})">Подробнее</button>
        </div>
    `).join('');
}

window.showItemDetail = function(id) {
    currentItem = menu.find(item => item.id === id);
    
    document.getElementById('item-content').innerHTML = `
        <div class = "modifier-body">
        <img src="${currentItem.image}" alt="${currentItem.name}" class="detail-image">
        <h2>${currentItem.name}</h2>
        <p class="item-price">Цена: ${currentItem.price} ₽</p>
        
        ${currentItem.modifiers?.length ? `
            <h3>Дополнительно:</h3>
            ${currentItem.modifiers.map(mod => `
                <div class="modifier">
                    <label>
                        <input type="checkbox" value="${mod.id}" data-price="${mod.price}">
                        ${mod.name} (+${mod.price} ₽)
                    </label>
                </div>
            `).join('')}
        ` : ''}
        </div>
    `;
        
    
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('item-view').style.display = 'block';
};

document.getElementById('back-button').addEventListener('click', () => {
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('item-view').style.display = 'none';
});

document.getElementById('add-cart').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#item-content input[type="checkbox"]:checked');
    const modifiers = Array.from(checkboxes).map(cb => ({
        name: cb.parentNode.textContent.trim().split(' (+')[0],
        price: +cb.dataset.price
    }));
    
    const totalPrice = currentItem.price + modifiers.reduce((sum, mod) => sum + mod.price, 0);
    
    addToCart(currentItem.id, modifiers.map(m => m.name), totalPrice);
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('item-view').style.display = 'none';
});

function updateCart() {
    const cartDiv = document.getElementById('cart');
    const total = cart.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0);
    
    cartDiv.innerHTML = cart.length ? [
        ...cart.map(item => `
            <div class="cart-item">
                <div>
                    <strong>${item.name} x${item.quantity}</strong>
                    ${item.modifiers?.length ? `<div>(${item.modifiers.join(', ')})</div>` : ''}
                </div>
                <span>${item.totalPrice * item.quantity} ₽</span>
            </div>
        `),
        `<div class="cart-total">
            <span>Итого:</span>
            <span>${total} ₽</span>
        </div>`
    ].join('') : '<p>Корзина пуста</p>';
}

window.addToCart = function(id, modifiers = [], totalPrice = menu.find(i => i.id === id).price) {
    const existing = cart.find(i => 
        i.id === id && 
        JSON.stringify(i.modifiers) === JSON.stringify(modifiers)
    );
    
    if (existing) existing.quantity++;
    else cart.push({ 
        ...menu.find(i => i.id === id), 
        quantity: 1,
        modifiers,
        totalPrice
    });
    
    updateCart();
};

document.getElementById('sendOrder').addEventListener('click', () => {
    if (!cart.length) return alert('Корзина пуста!');
    
    tg.sendData(JSON.stringify({
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0),
        timestamp: new Date().toISOString()
    }));
    tg.close();
});

displayMenu();
updateCart();