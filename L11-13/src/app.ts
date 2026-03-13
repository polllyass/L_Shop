// --- 1. ТИПЫ И ИНТЕРФЕЙСЫ ---
interface IProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    inStock: boolean;
}

interface ICartItem extends IProduct {
    quantity: number;
}

interface IUser {
    id: string;
    name: string;
    email: string;
    login: string;
    phone: string;
}

interface IAuthResponse {
    user: IUser;
    message?: string;
}

interface IDeliveryData {
    address: string;
    phone: string;
    email: string;
}

// --- 2. СОСТОЯНИЕ ---
const state = {
    isAuthenticated: false,
    currentUser: null as IUser | null,
    products: [] as IProduct[],
    cart: [] as ICartItem[],
    filters: { search: '' }
};

// --- 3. API КЛИЕНТ ---
const API = {
    baseUrl: 'http://localhost:3000/api',

    async request<T>(url: string, method: string = 'GET', body?: object): Promise<T> {
        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' 
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`${this.baseUrl}${url}`, options);
        if (response.status === 401 && !url.includes('/login')) {
            state.isAuthenticated = false;
            navigateTo('auth');
            throw new Error('Сессия истекла');
        }
        if (!response.ok) throw new Error('Ошибка API');
        return response.json();
    }
};

// --- 4. СТРАНИЦЫ ---

// --- ГЛАВНАЯ (Исправлены классы products-grid и price) ---
function renderHomePage(): void {
    const app = document.getElementById('app');
    if (!app) return;

    const filtered = state.products.filter(p => 
        p.name.toLowerCase().includes(state.filters.search.toLowerCase())
    );

    app.innerHTML = `
        <div class="catalog">
            <div class="filters">
                <input type="text" id="search" placeholder="Поиск товара..." value="${state.filters.search}">
            </div>
            <div class="products-grid"> ${filtered.map(p => `
                    <div class="product-card">
                        <h3 data-title>${p.name}</h3> 
                        <p class="description">${p.description}</p>
                        <b class="price" data-price>${p.price} BYN</b> <div class="card-actions">
                            <input type="number" value="1" min="1" id="qty-${p.id}">
                            ${state.isAuthenticated ? 
                                `<button class="btn-buy" onclick="handleAddToCart('${p.id}')">В корзину</button>` : 
                                `<p><small>Нужна авторизация</small></p>`}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.getElementById('search')?.addEventListener('input', (e) => {
        state.filters.search = (e.target as HTMLInputElement).value;
        renderHomePage();
    });
}

// --- КОРЗИНА ---
function renderCartPage(): void {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div class="cart-page">
            <h2>Ваша корзина</h2>
            <div class="cart-list">
                ${state.cart.length === 0 ? '<p>Корзина пуста</p>' : state.cart.map(item => `
                    <div class="cart-item">
                        <span data-title="basket">${item.name}</span> 
                        <span data-price="basket">${item.price} BYN</span> 
                        <span>x${item.quantity}</span>
                    </div>
                `).join('')}
            </div>
            
            <form data-delivery id="delivery-form" class="form"> 
                <h3>Оформление заказа</h3>
                <div class="form-group">
                    <label>Адрес доставки</label>
                    <input name="address" placeholder="Адрес доставки" required>
                </div>
                <div class="form-group">
                    <label>Ваш телефон</label>
                    <input name="phone" placeholder="Ваш телефон" required value="${state.currentUser?.phone || ''}">
                </div>
                <button type="submit" class="btn btn-order">Заказать</button>
            </form>
        </div>
    `;

    document.getElementById('delivery-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data: IDeliveryData = {
            address: formData.get('address') as string,
            phone: formData.get('phone') as string,
            email: state.currentUser?.email || ''
        };
        
        await API.request('/order', 'POST', data);
        alert('Заказ оформлен!');
        state.cart = [];
        navigateTo('home');
    });
}

// --- ВХОД / РЕГИСТРАЦИЯ ---
function renderAuthPage(): void {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div class="auth-forms">
            <form data-registration id="register-form" class="form"> 
                <h2>Регистрация</h2>
                <div class="form-group"><input name="name" placeholder="Имя" required></div>
                <div class="form-group"><input name="email" type="email" placeholder="Email" required></div>
                <div class="form-group"><input name="login" placeholder="Логин" required></div>
                <div class="form-group"><input name="phone" placeholder="Телефон" required></div>
                <div class="form-group"><input name="password" type="password" placeholder="Пароль" required></div>
                <button type="submit" class="btn">Зарегистрироваться</button>
            </form>

            <form id="login-form" class="form">
                <h2>Вход</h2>
                <div class="form-group"><input name="login" placeholder="Логин" required></div>
                <div class="form-group"><input name="password" type="password" placeholder="Пароль" required></div>
                <button type="submit" class="btn">Войти</button>
            </form>
        </div>
    `;

    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target as HTMLFormElement).entries());
        const res = await API.request<IAuthResponse>('/users/register', 'POST', data);
        authDone(res.user);
    });

    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target as HTMLFormElement).entries());
        const res = await API.request<IAuthResponse>('/users/login', 'POST', data);
        authDone(res.user);
    });
}

function authDone(user: IUser) {
    state.isAuthenticated = true;
    state.currentUser = user;
    alert(`Добро пожаловать, ${user.name}!`);
    navigateTo('home');
}

// --- 5. ОБРАБОТЧИКИ И РОУТИНГ ---

(window as any).handleAddToCart = async (id: string) => {
    const qtyInput = document.getElementById(`qty-${id}`) as HTMLInputElement;
    const quantity = parseInt(qtyInput.value);
    try {
        await API.request('/cart/add', 'POST', { productId: id, quantity });
        alert('Добавлено!');
    } catch (e) {
        alert('Ошибка при добавлении в корзину');
    }
};

function navigateTo(page: string): void {
    window.location.hash = page === 'home' ? '' : page;
}

function handleRoute(): void {
    const hash = window.location.hash.replace('#', '') || 'home';
    if (hash === 'home') renderHomePage();
    else if (hash === 'cart') renderCartPage();
    else if (hash === 'auth') renderAuthPage();
}

// --- 6. ЗАПУСК ---
window.addEventListener('hashchange', handleRoute);

document.addEventListener('DOMContentLoaded', async () => {
    // Настройка кликов по кнопкам навигации
    document.querySelectorAll('[data-navigation]').forEach(el => {
        el.addEventListener('click', () => {
            const target = (el as HTMLElement).dataset.navigation;
            if (target) navigateTo(target);
        });
    });

    try {
        const user = await API.request<IUser>('/users/me').catch(() => null);
        if (user) {
            state.isAuthenticated = true;
            state.currentUser = user;
        }
        state.products = await API.request<IProduct[]>('/products');
    } catch (e) {
        console.warn('Сервер недоступен');
    }
    handleRoute();
});