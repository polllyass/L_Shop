// Типы данных, которые приходят с бэкенда
interface IProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  image?: string; // опционально
}

interface ICartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface IUser {
  id: string;
  name: string;
  email: string;
  // Другие поля, которые присылает сервер
}

// Состояние приложения
interface IAppState {
  isAuthenticated: boolean;
  currentUser: IUser | null;
  products: IProduct[];
  cart: ICartItem[];
  filters: {
    search: string;
    category: string;
    inStockOnly: boolean;
    sortBy: 'price-asc' | 'price-desc' | 'none';
  };
  currentPage: 'home' | 'cart' | 'auth';
}
// Состояние приложения
let state: IAppState = {
    isAuthenticated: false,
    currentUser: null,
    products: [],
    cart: [],
    filters: {
        search: '',
        category: 'all',
        inStockOnly: false,
        sortBy: 'none'
    },
    currentPage: 'home'
};

// API клиент
const API = {
    baseUrl: '', // относительные пути, так как фронт и бэк на одном домене
    
    async get<T>(endpoint: string): Promise<T> {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    },
    
    async post<T>(endpoint: string, data: any): Promise<T> {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    },
    
    async put<T>(endpoint: string, data: any): Promise<T> {
        const res = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    },
    
    async delete(endpoint: string): Promise<void> {
        const res = await fetch(endpoint, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    }
};

// Функции для работы с API
async function checkAuthStatus(): Promise<void> {
    try {
        // Эндпоинт, который будет проверять куку и возвращать пользователя
        const user = await API.get<IUser>('/api/auth/status');
        state.isAuthenticated = true;
        state.currentUser = user;
        updateUserInterface();
    } catch {
        state.isAuthenticated = false;
        state.currentUser = null;
    }
}

async function loadProducts(): Promise<void> {
    // Формируем query параметры для фильтрации/поиска/сортировки
    const params = new URLSearchParams();
    if (state.filters.search) params.append('search', state.filters.search);
    if (state.filters.category && state.filters.category !== 'all') 
        params.append('category', state.filters.category);
    if (state.filters.inStockOnly) params.append('inStock', 'true');
    if (state.filters.sortBy !== 'none') {
        const [field, order] = state.filters.sortBy.split('-');
        params.append('sort', field);
        params.append('order', order);
    }
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const products = await API.get<IProduct[]>(`/api/products${query}`);
    state.products = products;
    renderHomePage();
}

async function loadCart(): Promise<void> {
    if (!state.isAuthenticated) {
        state.cart = [];
        return;
    }
    try {
        const cart = await API.get<ICartItem[]>('/api/cart');
        state.cart = cart;
    } catch {
        state.cart = [];
    }
}

async function addToCart(productId: string, quantity: number): Promise<void> {
    if (!state.isAuthenticated) {
        alert('Необходимо войти в систему');
        navigateTo('auth');
        return;
    }
    
    await API.post('/api/cart/items', { productId, quantity });
    await loadCart();
    if (state.currentPage === 'cart') renderCartPage();
}

async function updateCartItem(productId: string, quantity: number): Promise<void> {
    await API.put(`/api/cart/items/${productId}`, { quantity });
    await loadCart();
    renderCartPage();
}

async function removeFromCart(productId: string): Promise<void> {
    await API.delete(`/api/cart/items/${productId}`);
    await loadCart();
    renderCartPage();
}

async function checkout(deliveryData: any): Promise<void> {
    // Здесь будет запрос на оформление заказа
    await API.post('/api/checkout', deliveryData);
    await loadCart(); // корзина должна очиститься на сервере
    alert('Заказ успешно оформлен!');
    navigateTo('home');
}

// Роутинг
function navigateTo(page: 'home' | 'cart' | 'auth'): void {
    state.currentPage = page;
    window.location.hash = page;
    renderPage();
}

function handleRouteChange(): void {
    const hash = window.location.hash.slice(1) || 'home';
    if (hash === 'home' || hash === 'cart' || hash === 'auth') {
        state.currentPage = hash;
        renderPage();
    } else {
        navigateTo('home');
    }
}

// Рендеринг страниц
async function renderPage(): Promise<void> {
    const app = document.getElementById('app');
    if (!app) return;
    
    await checkAuthStatus();
    
    switch (state.currentPage) {
        case 'home':
            await loadProducts();
            break;
        case 'cart':
            await loadCart();
            renderCartPage();
            break;
        case 'auth':
            renderAuthPage();
            break;
    }
}

function renderHomePage(): void {
    const app = document.getElementById('app');
    if (!app) return;
    
    // Получаем уникальные категории из товаров для фильтра
    const categories = ['all', ...new Set(state.products.map(p => p.category))];
    
    app.innerHTML = `
        <div class="filters">
            <input 
                type="text" 
                placeholder="Поиск товаров..." 
                id="search-input"
                value="${state.filters.search}"
            >
            
            <select id="category-select">
                ${categories.map(cat => `
                    <option value="${cat}" ${state.filters.category === cat ? 'selected' : ''}>
                        ${cat === 'all' ? 'Все категории' : cat}
                    </option>
                `).join('')}
            </select>
            
            <label>
                <input 
                    type="checkbox" 
                    id="in-stock-only"
                    ${state.filters.inStockOnly ? 'checked' : ''}
                >
                Только в наличии
            </label>
            
            <select id="sort-select">
                <option value="none" ${state.filters.sortBy === 'none' ? 'selected' : ''}>Без сортировки</option>
                <option value="price-asc" ${state.filters.sortBy === 'price-asc' ? 'selected' : ''}>Цена: по возрастанию</option>
                <option value="price-desc" ${state.filters.sortBy === 'price-desc' ? 'selected' : ''}>Цена: по убыванию</option>
            </select>
        </div>
        
        <div class="products-grid">
            ${state.products.map(product => `
                <div class="product-card" data-product-id="${product.id}">
                    ${product.image ? `<img src="${product.image}" alt="${product.name}">` : ''}
                    <h3 data-title>${product.name}</h3>
                    <div class="price" data-price>${product.price} ₽</div>
                    <div class="category">${product.category}</div>
                    <div class="${product.inStock ? 'in-stock' : 'out-of-stock'}">
                        ${product.inStock ? 'В наличии' : 'Нет в наличии'}
                    </div>
                    ${product.inStock ? `
                        <div class="add-to-cart">
                            <input type="number" min="1" value="1" id="quantity-${product.id}" class="quantity-input">
                            <button class="btn add-to-cart-btn" data-product-id="${product.id}">В корзину</button>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
    
    // Добавляем обработчики событий для фильтров
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        state.filters.search = (e.target as HTMLInputElement).value;
        loadProducts();
    });
    
    document.getElementById('category-select')?.addEventListener('change', (e) => {
        state.filters.category = (e.target as HTMLSelectElement).value;
        loadProducts();
    });
    
    document.getElementById('in-stock-only')?.addEventListener('change', (e) => {
        state.filters.inStockOnly = (e.target as HTMLInputElement).checked;
        loadProducts();
    });
    
    document.getElementById('sort-select')?.addEventListener('change', (e) => {
        state.filters.sortBy = (e.target as HTMLSelectElement).value as any;
        loadProducts();
    });
    
    // Добавляем обработчики для кнопок "В корзину"
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const productId = (e.target as HTMLElement).dataset.productId;
            if (!productId) return;
            
            const quantityInput = document.getElementById(`quantity-${productId}`) as HTMLInputElement;
            const quantity = parseInt(quantityInput.value);
            
            await addToCart(productId, quantity);
        });
    });
}

function renderCartPage(): void {
    const app = document.getElementById('app');
    if (!app) return;
    
    if (!state.isAuthenticated) {
        app.innerHTML = `
            <div class="form">
                <h2>Корзина</h2>
                <p>Пожалуйста, <a href="#" data-navigation="auth">войдите в систему</a>, чтобы просмотреть корзину.</p>
            </div>
        `;
        return;
    }
    
    const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    app.innerHTML = `
        <h2>Корзина</h2>
        
        ${state.cart.length === 0 ? `
            <p>Корзина пуста</p>
        ` : `
            <div class="cart-items">
                ${state.cart.map(item => `
                    <div class="cart-item" data-cart-item-id="${item.productId}">
                        <div class="cart-item-info">
                            <h4 data-title="basket">${item.name}</h4>
                            <div class="price" data-price="basket">${item.price} ₽</div>
                        </div>
                        <div class="cart-item-controls">
                            <button class="decrease-btn" data-product-id="${item.productId}">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="increase-btn" data-product-id="${item.productId}">+</button>
                            <button class="remove-btn" data-product-id="${item.productId}">Удалить</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="cart-total">
                <h3>Итого: ${totalPrice} ₽</h3>
            </div>
            
            <div class="delivery-form">
                <h3>Оформление доставки</h3>
                <form data-delivery>
                    <div class="form-group">
                        <label for="address">Адрес доставки</label>
                        <input type="text" id="address" required>
                    </div>
                    <div class="form-group">
                        <label for="phone">Телефон</label>
                        <input type="tel" id="phone" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" required>
                    </div>
                    <button type="submit" class="btn">Оформить заказ</button>
                </form>
            </div>
        `}
    `;
    
    // Обработчики для корзины
    document.querySelectorAll('.decrease-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const productId = (e.target as HTMLElement).dataset.productId;
            if (!productId) return;
            
            const item = state.cart.find(i => i.productId === productId);
            if (item && item.quantity > 1) {
                await updateCartItem(productId, item.quantity - 1);
            }
        });
    });
    
    document.querySelectorAll('.increase-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const productId = (e.target as HTMLElement).dataset.productId;
            if (!productId) return;
            
            const item = state.cart.find(i => i.productId === productId);
            if (item) {
                await updateCartItem(productId, item.quantity + 1);
            }
        });
    });
    
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const productId = (e.target as HTMLElement).dataset.productId;
            if (!productId) return;
            
            await removeFromCart(productId);
        });
    });
    
    // Обработчик формы доставки
    const deliveryForm = document.querySelector('[data-delivery]');
    if (deliveryForm) {
        deliveryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            
            await checkout({
                address: formData.get('address'),
                phone: formData.get('phone'),
                email: formData.get('email')
            });
        });
    }
}

function renderAuthPage(): void {
    const app = document.getElementById('app');
    if (!app) return;
    
    if (state.isAuthenticated) {
        app.innerHTML = `
            <div class="form">
                <h2>Вы уже вошли в систему</h2>
                <p>Добро пожаловать, ${state.currentUser?.name}!</p>
                <button class="btn" data-navigation="home">На главную</button>
            </div>
        `;
        return;
    }
    
    app.innerHTML = `
        <div class="form" data-registration>
            <h2>Регистрация / Вход</h2>
            
            <form id="register-form">
                <h3>Регистрация</h3>
                <div class="form-group">
                    <label for="reg-name">Имя</label>
                    <input type="text" id="reg-name" required>
                </div>
                <div class="form-group">
                    <label for="reg-email">Email</label>
                    <input type="email" id="reg-email" required>
                </div>
                <div class="form-group">
                    <label for="reg-login">Логин</label>
                    <input type="text" id="reg-login" required>
                </div>
                <div class="form-group">
                    <label for="reg-phone">Телефон</label>
                    <input type="tel" id="reg-phone" required>
                </div>
                <div class="form-group">
                    <label for="reg-password">Пароль</label>
                    <input type="password" id="reg-password" required>
                </div>
                <button type="submit" class="btn">Зарегистрироваться</button>
            </form>
            
            <hr style="margin: 20px 0;">
            
            <form id="login-form">
                <h3>Вход</h3>
                <div class="form-group">
                    <label for="login-email">Email или логин</label>
                    <input type="text" id="login-email" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Пароль</label>
                    <input type="password" id="login-password" required>
                </div>
                <button type="submit" class="btn">Войти</button>
            </form>
        </div>
    `;
    
    // Обработчик регистрации
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        
        try {
            await API.post('/api/auth/register', {
                name: (document.getElementById('reg-name') as HTMLInputElement).value,
                email: (document.getElementById('reg-email') as HTMLInputElement).value,
                login: (document.getElementById('reg-login') as HTMLInputElement).value,
                phone: (document.getElementById('reg-phone') as HTMLInputElement).value,
                password: (document.getElementById('reg-password') as HTMLInputElement).value
            });
            
            await checkAuthStatus();
            alert('Регистрация успешна!');
            navigateTo('home');
        } catch (error) {
            alert('Ошибка при регистрации');
        }
    });
    
    // Обработчик входа
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            await API.post('/api/auth/login', {
                email: (document.getElementById('login-email') as HTMLInputElement).value,
                password: (document.getElementById('login-password') as HTMLInputElement).value
            });
            
            await checkAuthStatus();
            alert('Вход выполнен успешно!');
            navigateTo('home');
        } catch (error) {
            alert('Ошибка при входе');
        }
    });
}

function updateUserInterface(): void {
    // Обновляем шапку (добавляем имя пользователя и кнопку выхода)
    const nav = document.querySelector('.nav');
    if (!nav) return;
    
    if (state.isAuthenticated && state.currentUser) {
        const userStatus = document.createElement('div');
        userStatus.className = 'user-status';
        userStatus.innerHTML = `
            <span class="user-name">${state.currentUser.name}</span>
            <button class="logout-btn">Выйти</button>
        `;
        
        // Заменяем кнопку входа на информацию о пользователе
        const authLink = nav.querySelector('[data-navigation="auth"]');
        if (authLink) {
            authLink.replaceWith(userStatus);
            userStatus.querySelector('.logout-btn')?.addEventListener('click', async () => {
                await API.post('/api/auth/logout', {});
                state.isAuthenticated = false;
                state.currentUser = null;
                navigateTo('home');
            });
        }
    } else {
        // Возвращаем кнопку входа
        const userStatus = nav.querySelector('.user-status');
        if (userStatus) {
            const authBtn = document.createElement('button');
            authBtn.className = 'nav__link';
            authBtn.setAttribute('data-navigation', 'auth');
            authBtn.textContent = 'Вход';
            userStatus.replaceWith(authBtn);
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Навигация
    document.querySelectorAll('[data-navigation]').forEach(el => {
        el.addEventListener('click', (e) => {
            const page = (e.target as HTMLElement).dataset.navigation;
            if (page === 'home' || page === 'cart' || page === 'auth') {
                navigateTo(page);
            }
        });
    });
    
    // Слушаем изменение хэша
    window.addEventListener('hashchange', handleRouteChange);
    
    // Запускаем приложение
    handleRouteChange();
});