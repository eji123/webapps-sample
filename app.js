/**
 * FreshMart Online Grocery Store Application
 * Works standalone in the browser (LocalStorage) and automatically syncs
 * with the Express backend API (/api/products, /api/orders) when available.
 */

const STORAGE_KEYS = {
  PRODUCTS: 'freshmart_grocery_products_v2',
  ORDERS: 'freshmart_grocery_orders_v2',
  CART: 'freshmart_grocery_cart_v2'
};

function createGrocerySvg(title, bgHex, emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
    <rect width="480" height="320" fill="${bgHex}"/>
    <circle cx="240" cy="130" r="70" fill="rgba(255,255,255,0.85)"/>
    <text x="240" y="152" font-size="74" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
    <text x="240" y="255" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#0f172a" text-anchor="middle">${title}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEFAULT_GROCERIES = [
  {
    id: 1,
    name: 'Organic Hass Avocados',
    category: 'Fruits & Vegetables',
    unit: 'Pack of 4 (approx. 700g)',
    price: 5.49,
    stock: 45,
    badge: 'Organic',
    image_url: 'assets/images/avocados.svg',
    fallback_svg: createGrocerySvg('Organic Hass Avocados', '#dcfce7', '🥑')
  },
  {
    id: 2,
    name: 'Sweet Cavendish Bananas',
    category: 'Fruits & Vegetables',
    unit: '1 kg Bunch',
    price: 1.99,
    stock: 80,
    badge: 'Best Seller',
    image_url: 'assets/images/bananas.svg',
    fallback_svg: createGrocerySvg('Sweet Bananas', '#fef9c3', '🍌')
  },
  {
    id: 3,
    name: 'Fresh Sweet Strawberries',
    category: 'Fruits & Vegetables',
    unit: '250g Punnet',
    price: 4.25,
    stock: 35,
    badge: 'Farm Fresh',
    image_url: 'assets/images/strawberries.svg',
    fallback_svg: createGrocerySvg('Fresh Strawberries', '#ffe4e6', '🍓')
  },
  {
    id: 4,
    name: 'Organic Baby Spinach',
    category: 'Fruits & Vegetables',
    unit: '200g Washed Bag',
    price: 2.89,
    stock: 50,
    badge: 'Organic',
    image_url: 'assets/images/spinach.svg',
    fallback_svg: createGrocerySvg('Baby Spinach', '#dcfce7', '🥬')
  },
  {
    id: 5,
    name: 'Pasture-Raised Brown Eggs',
    category: 'Dairy & Eggs',
    unit: 'Dozen (12 Large Eggs)',
    price: 4.79,
    stock: 60,
    badge: 'Free Range',
    image_url: 'assets/images/eggs.svg',
    fallback_svg: createGrocerySvg('Free-Range Eggs', '#fef3c7', '🥚')
  },
  {
    id: 6,
    name: 'Fresh Whole Cow Milk',
    category: 'Dairy & Eggs',
    unit: '1 Liter Bottle',
    price: 2.49,
    stock: 65,
    badge: 'Daily Fresh',
    image_url: 'assets/images/milk.svg',
    fallback_svg: createGrocerySvg('Fresh Whole Milk', '#e0f2fe', '🥛')
  },
  {
    id: 7,
    name: 'Artisan Sourdough Loaf',
    category: 'Bakery',
    unit: '650g Freshly Baked',
    price: 4.99,
    stock: 22,
    badge: 'Baked Today',
    image_url: 'assets/images/sourdough.svg',
    fallback_svg: createGrocerySvg('Artisan Sourdough', '#fef3c7', '🍞')
  },
  {
    id: 8,
    name: 'French Butter Croissants',
    category: 'Bakery',
    unit: 'Box of 4 Pastries',
    price: 5.99,
    stock: 28,
    badge: 'Popular',
    image_url: 'assets/images/croissants.svg',
    fallback_svg: createGrocerySvg('Butter Croissants', '#ffedd5', '🥐')
  },
  {
    id: 9,
    name: 'Norwegian Atlantic Salmon Fillet',
    category: 'Meat & Seafood',
    unit: '400g Vacuum Pack',
    price: 12.99,
    stock: 18,
    badge: 'Wild Caught',
    image_url: 'assets/images/salmon.svg',
    fallback_svg: createGrocerySvg('Atlantic Salmon', '#ffe4e6', '🍣')
  },
  {
    id: 10,
    name: 'Grass-Fed Beef Ribeye Steak',
    category: 'Meat & Seafood',
    unit: '350g Cut',
    price: 14.50,
    stock: 15,
    badge: 'Prime Cut',
    image_url: 'assets/images/steak.svg',
    fallback_svg: createGrocerySvg('Beef Ribeye Steak', '#fee2e2', '🥩')
  },
  {
    id: 11,
    name: 'Cold-Pressed Valencia Orange Juice',
    category: 'Pantry & Drinks',
    unit: '1 Liter Carafe',
    price: 4.50,
    stock: 40,
    badge: '100% Pure',
    image_url: 'assets/images/orange-juice.svg',
    fallback_svg: createGrocerySvg('Orange Juice', '#ffedd5', '🍊')
  },
  {
    id: 12,
    name: 'Extra Virgin Olive Oil',
    category: 'Pantry & Drinks',
    unit: '500ml Glass Bottle',
    price: 9.99,
    stock: 30,
    badge: 'Cold Pressed',
    image_url: 'assets/images/olive-oil.svg',
    fallback_svg: createGrocerySvg('Extra Virgin Olive Oil', '#ecfccb', '🫒')
  }
];

let products = [];
let orders = [];
let cart = [];
let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'featured';
let promoApplied = false;
let isDatabaseConnected = false;

// Toast Helper
function showToast(message) {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// Load / Save State
function loadLocalState() {
  try {
    const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    products = savedProducts ? JSON.parse(savedProducts) : [...DEFAULT_GROCERIES];
    if (!Array.isArray(products) || products.length === 0) {
      products = [...DEFAULT_GROCERIES];
    }
  } catch {
    products = [...DEFAULT_GROCERIES];
  }

  try {
    const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    orders = savedOrders ? JSON.parse(savedOrders) : [];
  } catch {
    orders = [];
  }

  try {
    const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
    cart = savedCart ? JSON.parse(savedCart) : [];
  } catch {
    cart = [];
  }
}

function saveLocalProducts() {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

function saveLocalOrders() {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

function saveLocalCart() {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
}

// Sync with Backend API if MySQL database is active
async function syncWithServer() {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const serverProducts = await res.json();
      if (Array.isArray(serverProducts) && serverProducts.length > 0) {
        isDatabaseConnected = true;
        products = serverProducts.map((item) => ({
          ...item,
          price: Number(item.price),
          stock: Number(item.stock),
          fallback_svg: createGrocerySvg(item.name, '#dcfce7', '🛒')
        }));
        saveLocalProducts();
      }
    }
  } catch {
    isDatabaseConnected = false;
  }

  try {
    const resOrders = await fetch('/api/orders');
    if (resOrders.ok) {
      const serverOrders = await resOrders.json();
      if (Array.isArray(serverOrders)) {
        orders = serverOrders;
        saveLocalOrders();
      }
    }
  } catch {
    // Fallback to localStorage orders
  }

  renderCatalog();
  renderInventoryTable();
  updateOrderCountBadge();
}

// Render Product Grid
function renderCatalog() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  let filtered = products.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.badge && p.badge.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  if (sortMode === 'price-asc') {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortMode === 'price-desc') {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortMode === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No matching groceries found</h3>
        <p>Try clearing your search filter or switching to "All Groceries".</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered
    .map((item) => {
      const cartEntry = cart.find((c) => Number(c.id) === Number(item.id));
      const qtyInCart = cartEntry ? cartEntry.qty : 0;
      const fallbackImg = item.fallback_svg || createGrocerySvg(item.name, '#dcfce7', '🛒');

      return `
        <article class="product-card">
          <div class="product-thumb-wrap">
            ${item.badge ? `<span class="product-badge">${escapeHtml(item.badge)}</span>` : ''}
            <span class="stock-pill">${Number(item.stock)} in stock</span>
            <img
              src="${escapeHtml(item.image_url || fallbackImg)}"
              alt="${escapeHtml(item.name)}"
              class="product-thumb"
              onerror="this.onerror=null;this.src='${fallbackImg}';"
            />
          </div>
          <div class="product-body">
            <div class="product-cat">${escapeHtml(item.category)}</div>
            <h3 class="product-title">${escapeHtml(item.name)}</h3>
            <div class="product-unit">${escapeHtml(item.unit || '1 Pack')}</div>
            <div class="product-footer">
              <span class="product-price">$${Number(item.price).toFixed(2)}</span>
              ${
                qtyInCart > 0
                  ? `<div class="qty-stepper">
                      <button type="button" class="qty-btn" onclick="changeCartQty(${item.id}, -1)">−</button>
                      <span class="qty-val">${qtyInCart}</span>
                      <button type="button" class="qty-btn" onclick="changeCartQty(${item.id}, 1)">+</button>
                    </div>`
                  : `<button type="button" class="btn-add-cart" onclick="addToCart(${item.id})">
                      <span>+</span> Add to Cart
                    </button>`
              }
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

// Cart Logic
window.addToCart = function (productId) {
  const product = products.find((p) => Number(p.id) === Number(productId));
  if (!product) return;

  const existing = cart.find((c) => Number(c.id) === Number(productId));
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      unit: product.unit || '1 Pack',
      image_url: product.image_url,
      fallback_svg: product.fallback_svg,
      qty: 1
    });
  }

  saveLocalCart();
  updateCartUI();
  renderCatalog();
  showToast(`Added ${product.name} to cart`);
};

window.changeCartQty = function (productId, delta) {
  const index = cart.findIndex((c) => Number(c.id) === Number(productId));
  if (index === -1) return;

  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  saveLocalCart();
  updateCartUI();
  renderCatalog();
};

function calculateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const discountedSubtotal = subtotal - discount;
  const delivery = subtotal === 0 ? 0 : discountedSubtotal >= 35 ? 0 : 3.99;
  const total = discountedSubtotal + delivery;
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  return { subtotal, discount, delivery, total, count };
}

function updateCartUI() {
  const { subtotal, discount, delivery, total, count } = calculateTotals();

  const headerTotal = document.getElementById('headerCartTotal');
  const badge = document.getElementById('cartCountBadge');
  if (headerTotal) headerTotal.textContent = `$${total.toFixed(2)}`;
  if (badge) badge.textContent = String(count);

  const container = document.getElementById('cartItemsContainer');
  if (container) {
    if (cart.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:#64748b; padding:1.2rem 0;">Your shopping cart is empty.</p>`;
    } else {
      container.innerHTML = cart
        .map((item) => {
          const fallbackImg = item.fallback_svg || createGrocerySvg(item.name, '#dcfce7', '🛒');
          return `
            <div class="cart-item-row">
              <div class="cart-item-left">
                <img
                  src="${escapeHtml(item.image_url || fallbackImg)}"
                  alt="${escapeHtml(item.name)}"
                  class="cart-item-img"
                  onerror="this.onerror=null;this.src='${fallbackImg}';"
                />
                <div>
                  <div class="cart-item-title">${escapeHtml(item.name)}</div>
                  <div class="cart-item-meta">$${Number(item.price).toFixed(2)} each • ${escapeHtml(item.unit || '')}</div>
                </div>
              </div>
              <div class="cart-item-right">
                <div class="qty-stepper">
                  <button type="button" class="qty-btn" onclick="changeCartQty(${item.id}, -1)">−</button>
                  <span class="qty-val">${item.qty}</span>
                  <button type="button" class="qty-btn" onclick="changeCartQty(${item.id}, 1)">+</button>
                </div>
                <strong>$${(Number(item.price) * item.qty).toFixed(2)}</strong>
              </div>
            </div>
          `;
        })
        .join('');
    }
  }

  const subEl = document.getElementById('summarySubtotal');
  const discRow = document.getElementById('discountRow');
  const discEl = document.getElementById('summaryDiscount');
  const delEl = document.getElementById('summaryDelivery');
  const totEl = document.getElementById('summaryTotal');

  if (subEl) subEl.textContent = `$${subtotal.toFixed(2)}`;
  if (discRow) discRow.style.display = promoApplied && discount > 0 ? 'flex' : 'none';
  if (discEl) discEl.textContent = `-$${discount.toFixed(2)}`;
  if (delEl) delEl.textContent = delivery === 0 && subtotal > 0 ? 'FREE' : `$${delivery.toFixed(2)}`;
  if (totEl) totEl.textContent = `$${total.toFixed(2)}`;
}

// Store Inventory Table
function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  tbody.innerHTML = products
    .map(
      (item) => `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.unit || '1 Pack')}</td>
        <td>$${Number(item.price).toFixed(2)}</td>
        <td>${Number(item.stock)}</td>
        <td>
          <button type="button" class="btn-danger-sm" onclick="deleteProduct(${item.id})">Delete</button>
        </td>
      </tr>
    `
    )
    .join('');
}

window.deleteProduct = async function (id) {
  if (isDatabaseConnected) {
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
    } catch {
      // Continue with local deletion
    }
  }
  products = products.filter((p) => Number(p.id) !== Number(id));
  cart = cart.filter((c) => Number(c.id) !== Number(id));
  saveLocalProducts();
  saveLocalCart();
  renderCatalog();
  renderInventoryTable();
  updateCartUI();
  showToast('Product removed from catalog');
};

function updateOrderCountBadge() {
  const el = document.getElementById('orderCountText');
  if (el) el.textContent = String(orders.length);
}

function renderOrdersList() {
  const container = document.getElementById('ordersListContainer');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#64748b; padding:1.5rem 0;">No customer orders placed yet.</p>`;
    return;
  }

  container.innerHTML = orders
    .map(
      (o) => `
      <div class="order-card">
        <div class="order-card-header">
          <span>Order #${escapeHtml(String(o.id || '101'))} — ${escapeHtml(o.customer_name || 'Customer')}</span>
          <span style="color:#16a34a;">$${Number(o.total_amount || 0).toFixed(2)}</span>
        </div>
        <div class="order-card-body">
          <p><strong>Items:</strong> ${escapeHtml(o.items_summary || '')}</p>
          <p><strong>Address:</strong> ${escapeHtml(o.delivery_address || '')} (${escapeHtml(o.customer_phone || '')})</p>
          <p style="margin-top:0.25rem; font-size:0.75rem; color:#94a3b8;">Placed: ${escapeHtml(String(o.created_at || new Date().toLocaleString()))}</p>
        </div>
      </div>
    `
    )
    .join('');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadLocalState();
  renderCatalog();
  updateCartUI();
  renderInventoryTable();
  updateOrderCountBadge();
  syncWithServer();

  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value || '';
      renderCatalog();
    });
  }

  // Category Filters
  const catContainer = document.getElementById('categoryFilters');
  if (catContainer) {
    catContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-pill');
      if (!btn) return;
      catContainer.querySelectorAll('.cat-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category || 'all';
      renderCatalog();
    });
  }

  // Sort
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortMode = e.target.value;
      renderCatalog();
    });
  }

  // Modals
  const cartDialog = document.getElementById('cartDialog');
  const manageDialog = document.getElementById('manageDialog');
  const ordersDialog = document.getElementById('ordersDialog');

  document.getElementById('openCartBtn')?.addEventListener('click', () => {
    updateCartUI();
    cartDialog?.showModal();
  });
  document.getElementById('closeCartBtn')?.addEventListener('click', () => cartDialog?.close());

  document.getElementById('openManageBtn')?.addEventListener('click', () => {
    renderInventoryTable();
    manageDialog?.showModal();
  });
  document.getElementById('closeManageBtn')?.addEventListener('click', () => manageDialog?.close());

  document.getElementById('openOrdersBtn')?.addEventListener('click', () => {
    renderOrdersList();
    ordersDialog?.showModal();
  });
  document.getElementById('closeOrdersBtn')?.addEventListener('click', () => ordersDialog?.close());

  // Promo Code
  document.getElementById('applyPromoBtn')?.addEventListener('click', () => {
    const code = (document.getElementById('promoCodeInput')?.value || '').trim().toUpperCase();
    if (code === 'FRESH10') {
      promoApplied = true;
      updateCartUI();
      showToast('Promo code FRESH10 (10% OFF) applied!');
    } else {
      showToast('Invalid promo code. Try FRESH10');
    }
  });

  // Checkout Submit
  document.getElementById('checkoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Your cart is empty!');
      return;
    }

    const { total } = calculateTotals();
    const customer_name = document.getElementById('customerName').value.trim();
    const customer_phone = document.getElementById('customerPhone').value.trim();
    const delivery_address = document.getElementById('customerAddress').value.trim();
    const items_summary = cart.map((c) => `${c.qty}x ${c.name}`).join(', ');

    const newOrder = {
      id: Date.now().toString().slice(-5),
      customer_name,
      customer_phone,
      delivery_address,
      items_summary,
      total_amount: Number(total.toFixed(2)),
      created_at: new Date().toLocaleString()
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved.id) newOrder.id = saved.id;
      }
    } catch {
      // Saved locally
    }

    orders.unshift(newOrder);
    saveLocalOrders();
    cart = [];
    promoApplied = false;
    saveLocalCart();
    updateCartUI();
    renderCatalog();
    updateOrderCountBadge();
    e.target.reset();
    cartDialog?.close();
    showToast('Order placed successfully!');
  });

  // Add Product Form
  document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value;
    const unit = document.getElementById('prodUnit').value.trim() || '1 Pack';
    const price = Number(document.getElementById('prodPrice').value);
    const stock = Number(document.getElementById('prodStock').value);
    const badge = document.getElementById('prodBadge').value.trim() || 'Fresh';
    const imageUrlInput = document.getElementById('prodImageUrl').value.trim();
    const fileInput = document.getElementById('prodImageFile');

    let image_url = imageUrlInput || createGrocerySvg(name, '#dcfce7', '🛒');

    if (fileInput?.files?.[0]) {
      image_url = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(fileInput.files[0]);
      });
    }

    const newProd = {
      id: Date.now(),
      name,
      category,
      unit,
      price,
      stock,
      badge,
      image_url,
      fallback_svg: createGrocerySvg(name, '#dcfce7', '🛒')
    };

    products.unshift(newProd);
    saveLocalProducts();
    renderCatalog();
    renderInventoryTable();
    e.target.reset();
    showToast(`Added "${name}" to catalog!`);
  });

  // Reset Default Catalog
  document.getElementById('resetCatalogBtn')?.addEventListener('click', () => {
    products = [...DEFAULT_GROCERIES];
    saveLocalProducts();
    renderCatalog();
    renderInventoryTable();
    showToast('Default grocery catalog restored');
  });
});
