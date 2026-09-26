/**
 * FreshMart Online Grocery Store Application
 * Loads the grocery catalog strictly from the backend MySQL / Amazon RDS database (/api/products).
 * If RDS is not connected, the grocery product list will not be displayed on the website.
 */

const STORAGE_KEYS = {
  CART: 'freshmart_grocery_cart_v3'
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

let products = [];
let orders = [];
let cart = [];
let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'featured';
let promoApplied = false;
let isDatabaseConnected = false;

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

function loadLocalCart() {
  // Remove any legacy localStorage product caches so disconnected RDS never shows cached items
  localStorage.removeItem('freshmart_grocery_products');
  localStorage.removeItem('freshmart_grocery_products_v2');
  localStorage.removeItem('cloudmart_rds_products');

  try {
    const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
    cart = savedCart ? JSON.parse(savedCart) : [];
  } catch {
    cart = [];
  }
}

function saveLocalCart() {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
}

// Fetch products & orders strictly from the RDS-backed API
async function syncWithServer() {
  try {
    const res = await fetch('/api/products', { cache: 'no-store' });
    if (res.ok) {
      const serverProducts = await res.json();
      isDatabaseConnected = true;
      products = Array.isArray(serverProducts)
        ? serverProducts.map((item) => ({
            ...item,
            price: Number(item.price),
            stock: Number(item.stock),
            fallback_svg: createGrocerySvg(item.name, '#dcfce7', '🛒')
          }))
        : [];
    } else {
      isDatabaseConnected = false;
      products = [];
    }
  } catch {
    isDatabaseConnected = false;
    products = [];
  }

  try {
    const resOrders = await fetch('/api/orders', { cache: 'no-store' });
    if (resOrders.ok) {
      const serverOrders = await resOrders.json();
      orders = Array.isArray(serverOrders) ? serverOrders : [];
    } else {
      orders = [];
    }
  } catch {
    orders = [];
  }

  renderCatalog();
  renderInventoryTable();
  updateOrderCountBadge();
}

function renderCatalog() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  // If RDS is disconnected or returned 0 products, do not show grocery list
  if (!isDatabaseConnected || products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No grocery products available</h3>
        <p>Unable to load product catalog from the database.</p>
      </div>
    `;
    return;
  }

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

function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  if (!isDatabaseConnected || products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; padding:1rem;">No products loaded (Database disconnected).</td></tr>`;
    return;
  }

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
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      showToast('Failed to delete: Database is not connected');
      return;
    }
    await syncWithServer();
    cart = cart.filter((c) => Number(c.id) !== Number(id));
    saveLocalCart();
    updateCartUI();
    showToast('Product removed from database');
  } catch {
    showToast('Failed to delete: Database is not connected');
  }
};

function updateOrderCountBadge() {
  const el = document.getElementById('orderCountText');
  if (el) el.textContent = String(orders.length);
}

function renderOrdersList() {
  const container = document.getElementById('ordersListContainer');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#64748b; padding:1.5rem 0;">No customer orders found in database.</p>`;
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
          <p style="margin-top:0.25rem; font-size:0.75rem; color:#94a3b8;">Placed: ${escapeHtml(String(o.created_at || ''))}</p>
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

document.addEventListener('DOMContentLoaded', () => {
  loadLocalCart();
  updateCartUI();
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

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name,
          customer_phone,
          delivery_address,
          items_summary,
          total_amount: Number(total.toFixed(2))
        })
      });

      if (!res.ok) {
        showToast('Order failed: Database is not connected');
        return;
      }

      cart = [];
      promoApplied = false;
      saveLocalCart();
      updateCartUI();
      await syncWithServer();
      e.target.reset();
      cartDialog?.close();
      showToast('Order placed successfully!');
    } catch {
      showToast('Order failed: Database is not connected');
    }
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

    let image_url = imageUrlInput || 'assets/images/avocados.svg';

    if (fileInput?.files?.[0]) {
      image_url = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(fileInput.files[0]);
      });
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, unit, price, stock, badge, image_url })
      });

      if (!res.ok) {
        showToast('Failed to add product: Database is not connected');
        return;
      }

      await syncWithServer();
      e.target.reset();
      showToast(`Added "${name}" to catalog!`);
    } catch {
      showToast('Failed to add product: Database is not connected');
    }
  });

  // Reset Default Catalog
  document.getElementById('resetCatalogBtn')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/products/reset', { method: 'POST' });
      if (!res.ok) {
        showToast('Failed to reset: Database is not connected');
        return;
      }
      await syncWithServer();
      showToast('Default grocery catalog restored in RDS');
    } catch {
      showToast('Failed to reset: Database is not connected');
    }
  });
});
