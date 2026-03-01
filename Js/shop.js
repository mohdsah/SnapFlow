// SnapFlow — SHOP Module
// 13. SHOP & CART
// ==========================================
const PRODUCTS = [
    { id: 1, name: 'Baju Lelaki Slim Fit', brand: 'Fesyen', price: 59, img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400', desc: 'Baju lelaki moden slim fit, pelbagai warna tersedia.' },
    { id: 2, name: 'Kasut Sukan Ringan', brand: 'Sukan', price: 129, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', desc: 'Kasut sukan ringan dan selesa untuk aktiviti harian.' },
    { id: 3, name: 'Set Penjagaan Kulit', brand: 'Kecantikan', price: 89, img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', desc: 'Set lengkap penjagaan kulit untuk kulit sihat bercahaya.' },
    { id: 4, name: 'Fon Telinga Wayarles', brand: 'Elektronik', price: 199, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', desc: 'Fon telinga Bluetooth dengan peredam bunyi aktif.' },
    { id: 5, name: 'Nasi Lemak Premium', brand: 'Makanan', price: 12, img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400', desc: 'Nasi lemak tradisional dengan sambal istimewa.' },
    { id: 6, name: 'Dress Perempuan Floral', brand: 'Fesyen', price: 79, img: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400', desc: 'Dress floral cantik sesuai untuk majlis santai.' },
    { id: 7, name: 'Smart Watch', brand: 'Elektronik', price: 299, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', desc: 'Jam tangan pintar dengan pemantauan kesihatan 24/7.' },
    { id: 8, name: 'Kek Coklat Homemade', brand: 'Makanan', price: 45, img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', desc: 'Kek coklat lembap buatan tangan, tempahan sahaja.' },
];

let cart = JSON.parse(localStorage.getItem('sf_cart_v2') || localStorage.getItem('snapflow_cart') || '[]');
function saveCart() { localStorage.setItem('sf_cart_v2', JSON.stringify(cart)); }

function filterBrand(brand, el) {
    document.querySelectorAll('.brand-item').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');

    const filtered = brand === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.brand === brand);
    const grid = document.getElementById('filtered-product-list');
    const title = document.getElementById('selected-brand-name');

    if (title) title.innerText = brand === 'All' ? 'Semua Produk' : brand;
    if (!grid) return;

    grid.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="window.location.href='product-detail.html?id=${p.id}'">
            <img loading="lazy" src="${p.img}" alt="${escapeHtml(p.name)}" style="width:100%;aspect-ratio:1/1;object-fit:cover;">
            <div style="padding:10px;">
                <h3 style="font-size:13px;margin:0 0 5px;">${escapeHtml(p.name)}</h3>
                <p style="color:#fe2c55;font-weight:bold;margin:0 0 8px;font-size:14px;">RM ${p.price.toLocaleString()}</p>
                <button onclick="event.stopPropagation();addToCart(${p.id})" class="btn-cart">
                    <i class="fa-solid fa-cart-plus"></i> Tambah
                </button>
            </div>
        </div>
    `).join('');
}

function loadShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    filterBrand('All', null);

    grid.innerHTML = PRODUCTS.map(p => `
        <div class="product-card">
            <img loading="lazy" src="${p.img}" alt="${escapeHtml(p.name)}" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px 10px 0 0;">
            <div style="padding:12px;">
                <h3 style="font-size:14px;margin:0 0 5px;">${escapeHtml(p.name)}</h3>
                <p style="color:#fe2c55;font-weight:bold;margin:0 0 10px;">RM ${p.price.toLocaleString()}</p>
                <button onclick="addToCart(${p.id})" class="btn-cart">
                    <i class="fa-solid fa-cart-plus"></i> Tambah ke Troli
                </button>
            </div>
        </div>
    `).join('');

    updateCartBadge();
}

function addToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(i => i.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart();
    updateCartBadge();
    showToast(`${product.name} ditambah ke troli! 🛒`, 'success');
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    const total = cart.reduce((sum, i) => sum + i.qty, 0);
    if (badge) {
        badge.innerText = total;
        badge.style.display = total > 0 ? 'block' : 'none';
    }
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('total-price');
    const countTitle = document.getElementById('cart-count-title');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:#555;">
                <i class="fa-solid fa-cart-shopping" style="font-size:50px;margin-bottom:20px;display:block;"></i>
                <p>Troli anda kosong.</p>
                <a href="shop.html" style="color:#fe2c55;font-weight:bold;">Pergi ke Kedai</a>
            </div>`;
        if (totalEl) totalEl.innerText = 'RM 0';
        if (countTitle) countTitle.innerText = '0';
        return;
    }

    if (countTitle) countTitle.innerText = cart.reduce((s, i) => s + i.qty, 0);

    container.innerHTML = cart.map(item => `
        <div style="display:flex;gap:15px;padding:15px;border-bottom:1px solid #111;align-items:center;">
            <img loading="lazy" src="${item.img}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;">
            <div style="flex:1;">
                <strong style="font-size:14px;">${escapeHtml(item.name)}</strong>
                <p style="color:#fe2c55;margin:5px 0;font-weight:bold;">RM ${item.price.toLocaleString()}</p>
                <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
                    <button onclick="changeQty(${item.id}, -1)" style="background:#222;color:#fff;border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;">-</button>
                    <span>${item.qty}</span>
                    <button onclick="changeQty(${item.id}, 1)" style="background:#222;color:#fff;border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;">+</button>
                    <button onclick="removeFromCart(${item.id})" style="background:transparent;color:#fe2c55;border:none;cursor:pointer;margin-left:auto;font-size:12px;"><i class="fa-solid fa-trash"></i> Buang</button>
                </div>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    if (totalEl) totalEl.innerText = `RM ${total.toLocaleString()}`;
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart();
    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    renderCart();
    showToast('Item dibuang dari troli.', 'info');
}

function checkout() {
    if (cart.length === 0) return showToast('Troli anda kosong!', 'warning');
    window.location.href = 'checkout.html';
}

function contactSeller(sellerId) {
    window.location.href = `chat.html?seller=${sellerId}`;
}

function goToCheckout(productName, price) {
    window.location.href = `checkout.html?product=${encodeURIComponent(productName)}&price=${price}`;
}

// ==========================================
// 37. SNAPFLOW PRO (Stripe Integration)
// ==========================================

// Konfigurasi Stripe — ganti dengan publishable key anda
// Dapatkan dari: https://dashboard.stripe.com/apikeys
const STRIPE_PUBLISHABLE_KEY = 'pk_live_GANTI_DENGAN_STRIPE_KEY';
const STRIPE_PRO_PRICE_ID    = 'price_GANTI_DENGAN_PRICE_ID'; // RM9.90/bulan
const STRIPE_SUCCESS_URL     = `${window.location.origin}/profile.html?pro=success`;
const STRIPE_CANCEL_URL      = `${window.location.origin}/profile.html`;

// Semak status Pro dari localStorage (untuk demo)
// Dalam produksi: semak dari Supabase table 'subscriptions'
function isUserPro() {
    return localStorage.getItem('sf_pro_status') === 'active';
}

function showProBadge() {
    const badge = document.getElementById('pro-badge');
    if (badge) badge.style.display = isUserPro() ? 'inline-flex' : 'none';
}

async function openProModal() {
    document.getElementById('pro-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'pro-modal';

    const isPro = isUserPro();

    modal.innerHTML = `
        <div onclick="document.getElementById('pro-modal').remove()"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9500;"></div>
        <div style="position:fixed;bottom:0;left:0;right:0;background:#0d0d0d;border-radius:20px 20px 0 0;
                    padding:24px;z-index:9501;border-top:2px solid #333;max-height:90vh;overflow-y:auto;">

            <!-- Header Pro -->
            <div style="text-align:center;margin-bottom:20px;">
                <div style="background:linear-gradient(135deg,#f6c90e,#ffdf6b);width:64px;height:64px;border-radius:20px;
                            display:flex;align-items:center;justify-content:center;margin:0 auto 12px;
                            box-shadow:0 0 30px rgba(246,201,14,0.4);font-size:28px;">⭐</div>
                <h2 style="margin:0 0 6px;font-size:22px;font-weight:900;
                           background:linear-gradient(135deg,#f6c90e,#ffdf6b);
                           -webkit-background-clip:text;-webkit-text-fill-color:transparent;">SnapFlow Pro</h2>
                <p style="margin:0;font-size:14px;color:#555;">Buka semua ciri premium SnapFlow</p>
            </div>

            <!-- Status kalau dah Pro -->
            ${isPro ? `
            <div style="background:linear-gradient(135deg,#1a1200,#0d0a00);border:1px solid #3a3000;
                        border-radius:12px;padding:14px;text-align:center;margin-bottom:16px;">
                <p style="margin:0;font-size:15px;font-weight:800;color:#f6c90e;">✅ Anda sudah menjadi ahli Pro!</p>
                <p style="margin:6px 0 0;font-size:13px;color:#665500;">Semua ciri premium telah diaktifkan.</p>
            </div>` : ''}

            <!-- Ciri-ciri Pro -->
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
                ${[
                    ['⭐', 'Lencana Pro Eksklusif', 'Tanda ⭐ di profil dan video anda'],
                    ['📊', 'Analytics Lanjutan', 'Data views, retention, dan audience demographics'],
                    ['🎬', 'Upload Video HD', 'Resolusi sehingga 4K, saiz fail hingga 500MB'],
                    ['∞',  'Upload Tanpa Had',  'Tiada limit 10 video/hari — upload sesuka hati'],
                    ['📅', 'Jadual Post Lanjutan', 'Jadualkan sehingga 30 post sekaligus'],
                    ['🚫', 'Tiada Iklan', 'Nikmati SnapFlow tanpa gangguan iklan'],
                    ['🎨', 'Filter Eksklusif Pro', '15 filter tambahan untuk video anda'],
                ].map(([icon, title, desc]) => `
                    <div style="display:flex;gap:12px;align-items:flex-start;padding:12px;background:#111;border-radius:10px;border:1px solid #1a1a1a;">
                        <span style="font-size:22px;flex-shrink:0;width:28px;text-align:center;">${icon}</span>
                        <div>
                            <p style="margin:0;font-size:14px;font-weight:700;">${title}</p>
                            <p style="margin:2px 0 0;font-size:12px;color:#555;">${desc}</p>
                        </div>
                        <i class="fa-solid fa-check" style="color:#f6c90e;margin-left:auto;flex-shrink:0;margin-top:3px;"></i>
                    </div>
                `).join('')}
            </div>

            <!-- Harga -->
            ${!isPro ? `
            <div style="background:linear-gradient(135deg,#1a1200,#0d0900);border:2px solid #f6c90e33;
                        border-radius:14px;padding:16px;text-align:center;margin-bottom:16px;">
                <p style="margin:0;font-size:32px;font-weight:900;color:#f6c90e;">RM9.90</p>
                <p style="margin:4px 0 0;font-size:13px;color:#665500;">sebulan · batalkan bila-bila masa</p>
            </div>

            <button onclick="startStripeCheckout()"
                style="width:100%;background:linear-gradient(135deg,#f6c90e,#ffdf6b);color:#000;border:none;
                       padding:16px;border-radius:14px;font-size:16px;font-weight:900;cursor:pointer;
                       font-family:inherit;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px;">
                ⭐ Langgani Pro Sekarang
            </button>

            <p style="text-align:center;font-size:11px;color:#333;margin:0;">
                Pembayaran selamat melalui Stripe · SSL encrypted
            </p>` : `
            <button onclick="managePro()"
                style="width:100%;background:#1a1a1a;color:#888;border:1px solid #333;
                       padding:14px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;
                       font-family:inherit;">
                Urus Langganan
            </button>`}
        </div>`;

    document.body.appendChild(modal);
}

async function startStripeCheckout() {
    const { data: { user } } = await snapSupabase.auth.getUser();
    if (!user) return showToast('Log masuk dahulu.', 'warning');

    showToast('Mengalihkan ke Stripe...', 'info');

    try {
        // Dalam produksi: panggil Supabase Edge Function untuk buat Stripe session
        // const { data } = await snapSupabase.functions.invoke('create-checkout', {
        //     body: { priceId: STRIPE_PRO_PRICE_ID, userId: user.id, email: user.email }
        // });
        // window.location.href = data.url;

        // DEMO MODE — simulate Pro activation
        localStorage.setItem('sf_pro_status', 'active');
        document.getElementById('pro-modal')?.remove();
        showToast('SnapFlow Pro diaktifkan! ⭐', 'success');
        showProBadge();
        showLocalNotification('SnapFlow Pro', '⭐ Selamat datang ke SnapFlow Pro! Semua ciri premium telah dibuka.');

    } catch (err) {
        showToast('Pembayaran gagal: ' + err.message, 'error');
    }
}

function managePro() {
    // Stripe customer portal
    showToast('Mengalihkan ke portal langganan...', 'info');
    // window.location.href = 'https://billing.stripe.com/p/login/...'

    // DEMO: batalkan Pro
    if (confirm('Batalkan SnapFlow Pro?')) {
        localStorage.removeItem('sf_pro_status');
        document.getElementById('pro-modal')?.remove();
        showToast('Langganan Pro dibatalkan.', 'info');
        showProBadge();
    }
}

function getProBadgeHTML() {
    if (!isUserPro()) return '';
    return `<span style="display:inline-flex;background:linear-gradient(135deg,#f6c90e,#ffdf6b);color:#000;
                         font-size:10px;font-weight:900;padding:2px 6px;border-radius:6px;margin-left:4px;
                         vertical-align:middle;">PRO</span>`;
}

// ==========================================
