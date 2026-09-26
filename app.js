/**
 * CloudMart - AWS 3-Tier E-Commerce Training Web App (EC2 + RDS + S3)
 * Supports both Zero-Setup Simulated Mode (Browser LocalStorage)
 * and Live AWS Backend Mode (Express API on EC2 + MySQL RDS + Amazon S3).
 * FreshMart Online Grocery Store Application
 * Works standalone in the browser (LocalStorage) and automatically connects
 * to the Express backend API (/api/products, /api/orders) when running on a server.
 */

const STORAGE_KEYS = {
  PRODUCTS: 'cloudmart_rds_products',
  ORDERS: 'cloudmart_rds_orders',
  CONFIG: 'cloudmart_aws_config',
  CART: 'cloudmart_cart'
  PRODUCTS: 'freshmart_grocery_products',
  ORDERS: 'freshmart_grocery_orders',
  CART: 'freshmart_grocery_cart'
};

// Generate clean SVG product placeholder data URLs so images always render offline or online
function createProductSvg(title, bgHex, iconText) {
// Generate clean SVG grocery illustrations so images always render offline or online
function createGrocerySvg(title, bgHex, emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
    <rect width="480" height="320" fill="${bgHex}"/>
    <circle cx="240" cy="130" r="62" fill="rgba(255,255,255,0.14)"/>
    <text x="240" y="148" font-size="54" text-anchor="middle">${iconText}</text>
    <text x="240" y="245" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">${title}</text>
    <circle cx="240" cy="130" r="68" fill="rgba(255,255,255,0.22)"/>
    <text x="240" y="152" font-size="64" text-anchor="middle">${emoji}</text>
    <text x="240" y="252" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">${title}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEFAULT_PRODUCTS = [
const DEFAULT_GROCERIES = [
  {
    id: 101,
    name: 'FIDO2 Hardware Security Key (IAM MFA)',
    category: 'Hardware',
    price: 49.00,
    stock: 42,
    s3_key: 'products/fido2-security-key.svg',
    image_url: createProductSvg('FIDO2 IAM Security Key', '#1e293b', '🔐'),
    description: 'Phishing-resistant USB-C hardware MFA key for securing AWS Root and IAM Administrator accounts.'
    id: 1,
    name: 'Organic Hass Avocados',
    category: 'Fruits & Vegetables',
    unit: 'Pack of 4 (approx. 700g)',
    price: 5.49,
    stock: 45,
    badge: 'Organic',
    image_url: createGrocerySvg('Organic Hass Avocados', '#15803d', '🥑')
  },
  {
    id: 102,
    name: 'AWS Solutions Architect Study Guide',
    category: 'Books & Courses',
    price: 39.50,
    stock: 85,
    s3_key: 'products/solutions-architect-book.svg',
    image_url: createProductSvg('AWS Architect Guide', '#3b48cc', '📘'),
    description: 'Comprehensive hands-on lab guide covering VPC networking, EC2 Auto Scaling, Multi-AZ RDS, and S3.'
    id: 2,
    name: 'Sweet Cavendish Bananas',
    category: 'Fruits & Vegetables',
    unit: '1 kg Bunch',
    price: 1.99,
    stock: 80,
    badge: 'Best Seller',
    image_url: createGrocerySvg('Sweet Bananas', '#ca8a04', '🍌')
  },
  {
    id: 103,
    name: 'Cloud Engineer Dark-Mode Hoodie',
    category: 'Apparel',
    price: 58.00,
    stock: 19,
    s3_key: 'products/cloud-engineer-hoodie.svg',
    image_url: createProductSvg('Cloud Engineer Hoodie', '#232f3e', '🧥'),
    description: 'Heavyweight fleece hoodie engineered for late-night production deployments and Terraform migrations.'
    id: 3,
    name: 'Fresh Strawberries',
    category: 'Fruits & Vegetables',
    unit: '250g Punnet',
    price: 4.25,
    stock: 35,
    badge: 'Farm Fresh',
    image_url: createGrocerySvg('Fresh Strawberries', '#dc2626', '🍓')
  },
  {
    id: 104,
    name: 'Mechanical DevOps Macro Pad (6-Key)',
    category: 'Hardware',
    price: 64.99,
    stock: 14,
    s3_key: 'products/devops-macropad.svg',
    image_url: createProductSvg('DevOps 6-Key Macro Pad', '#0f766e', '⌨️'),
    description: 'Hot-swappable mechanical macro keypad pre-programmed for kubectl, aws-cli, and git shortcuts.'
    id: 4,
    name: 'Organic Baby Spinach',
    category: 'Fruits & Vegetables',
    unit: '200g Washed Bag',
    price: 2.89,
    stock: 50,
    badge: 'Organic',
    image_url: createGrocerySvg('Baby Spinach', '#166534', '🥬')
  },
  {
    id: 105,
    name: 'Serverless Stainless Thermal Tumbler',
    category: 'Accessories',
    price: 24.00,
    id: 5,
    name: 'Pasture-Raised Brown Eggs',
    category: 'Dairy & Eggs',
    unit: 'Dozen (12 Large Eggs)',
    price: 4.79,
    stock: 60,
    s3_key: 'products/serverless-tumbler.svg',
    image_url: createProductSvg('Serverless Thermal Mug', '#b45309', '☕'),
    description: 'Zero cold-starts! Keeps coffee hot for 12 hours while debugging CloudWatch log streams.'
    badge: 'Free Range',
    image_url: createGrocerySvg('Free-Range Eggs', '#b45309', '🥚')
  },
  {
    id: 106,
    name: 'Multi-AZ High Availability Desk Mat',
    category: 'Accessories',
    price: 32.00,
    stock: 33,
    s3_key: 'products/multi-az-deskmat.svg',
    image_url: createProductSvg('Multi-AZ Architecture Mat', '#3f8624', '🗺️'),
    description: 'XL desk pad printed with AWS VPC subnet routing tables, CIDR cheat sheets, and IAM policy syntax.'
  }
];

const DEFAULT_ORDERS = [
    id: 6,
    name: 'Fresh Whole Cow Milk',
    category: 'Dairy & Eggs',
    unit: '1 Liter Bottle',
    price: 2.49,
    stock: 65,
    badge: 'Daily Fresh',
    image_url: createGrocerySvg('Fresh Whole Milk', '#0284c7', '🥛')
  },
  {
    id: 5001,
    customer_name: 'Budi Santoso',
    customer_email: 'budi.santoso@example.com',
    items_summary: '1x FIDO2 Hardware Security Key, 1x AWS Study Guide',
    total_amount: 88.50,
    status: 'COMPLETED (RDS)',
    created_at: '2026-09-25 08:30:12'
    id: 7,
    name: 'Artisan Sourdough Loaf',
    category: 'Bakery',
    unit: '650g Freshly Baked',
    price: 4.99,
    stock: 22,
    badge: 'Baked Today',
    image_url: createGrocerySvg('Artisan Sourdough', '#92400e', '🥖')
  },
  {
    id: 8,
    name: 'French Butter Croissants',
    category: 'Bakery',
    unit: 'Box of 4 Pastries',
    price: 5.99,
    stock: 28,
    badge: 'Popular',
    image_url: createGrocerySvg('Butter Croissants', '#d97706', '🥐')
  },
  {
    id: 9,
    name: 'Norwegian Atlantic Salmon Fillet',
    category: 'Meat & Seafood',
    unit: '400g Vacuum Pack',
    price: 12.99,
    stock: 18,
    badge: 'Wild Caught',
    image_url: createGrocerySvg('Atlantic Salmon', '#e11d48', '🐟')
  },
  {
    id: 10,
    name: 'Grass-Fed Beef Ribeye Steak',
    category: 'Meat & Seafood',
    unit: '350g Cut',
    price: 14.50,
    stock: 15,
    badge: 'Prime Cut',
    image_url: createGrocerySvg('Beef Ribeye Steak', '#991b1b', '🥩')
  },
  {
    id: 11,
    name: 'Cold-Pressed Valencia Orange Juice',
    category: 'Pantry & Drinks',
    unit: '1 Liter Carafe',
    price: 4.50,
    stock: 40,
    badge: '100% Pure',
    image_url: createGrocerySvg('Fresh Orange Juice', '#ea580c', '🍊')
  },
  {
    id: 12,
    name: 'Extra Virgin Olive Oil',
    category: 'Pantry & Drinks',
    unit: '500ml Glass Bottle',
    price: 9.99,
    stock: 30,
    badge: 'Cold Pressed',
    image_url: createGrocerySvg('Extra Virgin Olive Oil', '#3f6212', '🫒')
  }
];

// Application State
let awsConfig = loadConfig();
let products = [];
let orders = [];
let cart = loadCart();
let cart = [];
let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'featured';
let promoApplied = false;
let isServerAvailable = false;

function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Could not read config from localStorage', e);
  }
  return {
    mode: 'mock',
    apiBaseUrl: '/api',
    s3BucketName: 'cloudmart-assets-demo',
    awsRegion: 'ap-southeast-1'
  };
}

function saveConfig(newConfig) {
  awsConfig = newConfig;
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(awsConfig));
  updateStatusHeader();
}

function loadCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CART);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn(e);
  }
  return [];
}

function saveCart() {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  renderCartBadge();
}

// AWS Activity Logger (Simulates & displays EC2 / RDS / S3 calls)
function logAwsActivity(service, operation, detail) {
  const logContainer = document.getElementById('awsActivityLog');
  if (!logContainer) return;

  const entry = document.createElement('div');
  entry.className = `log-entry ${service.toLowerCase()}`;

  const now = new Date().toISOString().split('T')[1].slice(0, 8);
  entry.innerHTML = `
    <div class="log-meta">[${now} UTC] <strong>${service.toUpperCase()}</strong> • ${operation}</div>
    <div class="log-code">${escapeHtml(detail)}</div>
  `;

  logContainer.prepend(entry);
}

function escapeHtml(str) {
  return String(str)
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function updateStatusHeader() {
  const ec2Text = document.getElementById('status-text-ec2');
  const rdsText = document.getElementById('status-text-rds');
  const s3Text = document.getElementById('status-text-s3');
// Initialize Data (Checks optional Express server first, otherwise uses LocalStorage)
async function initStore() {
  cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');

  if (awsConfig.mode === 'live') {
    ec2Text.textContent = `Live API (${awsConfig.apiBaseUrl})`;
    rdsText.textContent = `MySQL RDS (${awsConfig.awsRegion})`;
    s3Text.textContent = `s3://${awsConfig.s3BucketName}`;
  } else {
    ec2Text.textContent = 'Simulated (Browser Demo)';
    rdsText.textContent = 'MySQL 8.0 (LocalStorage)';
    s3Text.textContent = `s3://${awsConfig.s3BucketName}`;
  }
}

// Data Layer: Load Products & Orders from either Mock LocalStorage or Live EC2 Backend
async function fetchAllData() {
  updateStatusHeader();

  if (awsConfig.mode === 'live') {
    try {
      logAwsActivity('EC2', 'GET /api/products', `Fetching catalog from EC2 (${awsConfig.apiBaseUrl}/products)`);
      const prodRes = await fetch(`${awsConfig.apiBaseUrl}/products`);
      if (!prodRes.ok) throw new Error(`HTTP ${prodRes.status}`);
      products = await prodRes.json();
      logAwsActivity('RDS', 'SELECT Query', 'SELECT id, name, category, price, stock, s3_key, image_url FROM products ORDER BY id DESC;');

      const ordRes = await fetch(`${awsConfig.apiBaseUrl}/orders`);
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      isServerAvailable = true;
      products = await res.json();
      const ordRes = await fetch('/api/orders');
      orders = ordRes.ok ? await ordRes.json() : [];
      logAwsActivity('RDS', 'SELECT Query', 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 50;');
    } catch (err) {
      logAwsActivity('EC2', 'Connection Fallback', `Live API unreachable (${err.message}). Falling back to Simulated Mode.`);
      loadMockData();
    } else {
      throw new Error('Static mode');
    }
  } else {
    loadMockData();
  } catch {
    isServerAvailable = false;
    const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    products = savedProds ? JSON.parse(savedProds) : [...DEFAULT_GROCERIES];
    if (!savedProds) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
    orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  }

  renderAll();
  renderStore();
}

function loadMockData() {
  const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);

  products = savedProds ? JSON.parse(savedProds) : [...DEFAULT_PRODUCTS];
  orders = savedOrders ? JSON.parse(savedOrders) : [...DEFAULT_ORDERS];

  if (!savedProds) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }
  if (!savedOrders) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }

  logAwsActivity('EC2', 'GET /api/products', 'EC2 instance serving storefront catalog');
  logAwsActivity('RDS', 'SELECT * FROM products', `Returned ${products.length} rows from MySQL RDS table 'products'`);
  logAwsActivity('S3', 'GET Object URLs', `Resolved ${products.length} product asset keys in s3://${awsConfig.s3BucketName}/products/`);
}

function renderAll() {
  renderStats();
  renderProductsGrid();
  renderOrdersTable();
  renderRdsProductsTable();
function renderStore() {
  renderProductGrid();
  renderCartBadge();
  renderInventoryTable();
  document.getElementById('orderCountText').textContent = orders.length;
}

function renderStats() {
  document.getElementById('statTotalProducts').textContent = products.length;
  document.getElementById('statTotalOrders').textContent = orders.length;
  document.getElementById('statS3Objects').textContent = products.length;
}

function renderProductsGrid() {
function renderProductGrid() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const filtered = products.filter((p) => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  let filtered = products.filter((item) => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.unit && item.unit.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  if (sortMode === 'price-asc') {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortMode === 'price-desc') {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortMode === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="panel-card" style="grid-column: 1 / -1; text-align:center;">
      <p>No matching products found in RDS database.</p>
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 3rem; background:#fff; border-radius:12px;">
      <h3>No groceries matched your search</h3>
      <p style="color:#64748b; margin-top:0.4rem;">Try selecting a different category or clearing your search filter.</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((prod) => {
      const s3Uri = `s3://${awsConfig.s3BucketName}/${prod.s3_key || 'products/item.png'}`;
      return `
      <article class="product-card">
        <div class="product-img-wrap">
          <img src="${prod.image_url}" alt="${escapeHtml(prod.name)}" loading="lazy" />
          <span class="category-tag">${escapeHtml(prod.category)}</span>
          <span class="s3-tag" title="${escapeHtml(s3Uri)}">🪣 ${escapeHtml(s3Uri)}</span>
        </div>
        <div class="product-body">
          <h3 class="product-title">${escapeHtml(prod.name)}</h3>
          <p class="product-desc">${escapeHtml(prod.description)}</p>
          <div class="product-meta">
            <span class="product-price">$${Number(prod.price).toFixed(2)}</span>
            <span class="product-stock">RDS Stock: ${prod.stock}</span>
          </div>
          <button type="button" class="btn-primary full-width" data-add-cart="${prod.id}">
    .map(
      (item) => `
    <article class="product-card">
      <div class="product-img-box">
        <img src="${item.image_url}" alt="${escapeHtml(item.name)}" loading="lazy" />
        ${item.badge ? `<span class="prod-badge">${escapeHtml(item.badge)}</span>` : ''}
        <span class="prod-cat-tag">${escapeHtml(item.category)}</span>
      </div>
      <div class="product-info">
        <h3 class="product-title">${escapeHtml(item.name)}</h3>
        <p class="product-unit">${escapeHtml(item.unit || '1 Pack')} • ${item.stock} in stock</p>
        <div class="product-bottom">
          <span class="product-price">$${Number(item.price).toFixed(2)}</span>
          <button type="button" class="btn-add-cart" data-add-id="${item.id}">
            + Add to Cart
          </button>
        </div>
      </article>
    `;
    })
    .join('');
}

function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">No orders recorded in RDS yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders
    .map(
      (o) => `
    <tr>
      <td><code>#${o.id}</code></td>
      <td><strong>${escapeHtml(o.customer_name)}</strong></td>
      <td>${escapeHtml(o.customer_email)}</td>
      <td>${escapeHtml(o.items_summary)}</td>
      <td><strong>$${Number(o.total_amount).toFixed(2)}</strong></td>
      <td>${escapeHtml(o.created_at)}</td>
      <td><span class="service-badge">${escapeHtml(o.status || 'CONFIRMED')}</span></td>
    </tr>
      </div>
    </article>
  `
    )
    .join('');
}

function renderRdsProductsTable() {
  const tbody = document.getElementById('rdsProductsTableBody');
  if (!tbody) return;
function saveCart() {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  renderCartBadge();
}

  tbody.innerHTML = products
    .map(
      (p) => `
    <tr>
      <td><code>${p.id}</code></td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.category)}</td>
      <td>$${Number(p.price).toFixed(2)}</td>
      <td>${p.stock}</td>
      <td><code>s3://${escapeHtml(awsConfig.s3BucketName)}/${escapeHtml(p.s3_key)}</code></td>
      <td>
        <button type="button" class="btn-danger-sm" data-delete-product="${p.id}">Delete Row</button>
      </td>
    </tr>
  `
    )
    .join('');
function renderCartBadge() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  document.getElementById('cartCountBadge').textContent = count;
  document.getElementById('headerCartTotal').textContent = `$${subtotal.toFixed(2)}`;
}

// Cart Operations
function addToCart(productId) {
  const product = products.find((p) => Number(p.id) === Number(productId));
  if (!product) return;
function addToCart(id) {
  const prod = products.find((p) => Number(p.id) === Number(id));
  if (!prod) return;

  const existing = cart.find((item) => Number(item.id) === Number(productId));
  const existing = cart.find((c) => Number(c.id) === Number(id));
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      id: prod.id,
      name: prod.name,
      unit: prod.unit || '1 Pack',
      price: Number(prod.price),
      qty: 1
    });
  }
  saveCart();
}

function updateCartItemQty(id, delta) {
  const item = cart.find((c) => Number(c.id) === Number(id));
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((c) => Number(c.id) !== Number(id));
  }
  saveCart();
  logAwsActivity('EC2', 'Session Cart Update', `Added 1x "${product.name}" ($${Number(product.price).toFixed(2)}) to active cart.`);
  renderCartModal();
}

function renderCartBadge() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cartCountBadge').textContent = count;
function getCartTotals() {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const afterDiscount = subtotal - discount;
  const delivery = cart.length === 0 ? 0 : afterDiscount >= 35 ? 0 : 3.99;
  const total = afterDiscount + delivery;
  return { subtotal, discount, delivery, total };
}

function renderCartModal() {
  const container = document.getElementById('cartItemsContainer');
  const subtotalEl = document.getElementById('cartSubtotal');
  const submitBtn = document.getElementById('checkoutSubmitBtn');

  if (cart.length === 0) {
    container.innerHTML = `<p class="text-muted">Your cart is empty. Add products from the storefront to test RDS order insertion.</p>`;
    subtotalEl.textContent = '$0.00';
    container.innerHTML = `<p style="color:#64748b; text-align:center; padding: 1.25rem 0;">Your grocery basket is empty.</p>`;
    submitBtn.disabled = true;
    return;
  }

  submitBtn.disabled = false;
  let total = 0;

  container.innerHTML = cart
    .map((item) => {
      const lineTotal = item.price * item.qty;
      total += lineTotal;
      return `
      <div class="cart-item">
  } else {
    submitBtn.disabled = false;
    container.innerHTML = cart
      .map(
        (item) => `
      <div class="cart-item-row">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <div class="text-muted">$${item.price.toFixed(2)} × ${item.qty}</div>
          <div style="font-size:0.78rem; color:#64748b;">$${item.price.toFixed(2)} each</div>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <strong>$${lineTotal.toFixed(2)}</strong>
          <button type="button" class="btn-danger-sm" data-remove-cart="${item.id}">Remove</button>
        <div class="qty-controls">
          <button type="button" class="qty-btn" data-qty-id="${item.id}" data-delta="-1">−</button>
          <span><strong>${item.qty}</strong></span>
          <button type="button" class="qty-btn" data-qty-id="${item.id}" data-delta="1">+</button>
          <strong style="min-width:58px; text-align:right;">$${(item.price * item.qty).toFixed(2)}</strong>
        </div>
      </div>
    `;
    })
    `
      )
      .join('');
  }

  const { subtotal, discount, delivery, total } = getCartTotals();
  document.getElementById('summarySubtotal').textContent = `$${subtotal.toFixed(2)}`;
  const discountRow = document.getElementById('discountRow');
  if (promoApplied && discount > 0) {
    discountRow.style.display = 'flex';
    document.getElementById('summaryDiscount').textContent = `-$${discount.toFixed(2)}`;
  } else {
    discountRow.style.display = 'none';
  }
  document.getElementById('summaryDelivery').textContent = delivery === 0 ? 'FREE' : `$${delivery.toFixed(2)}`;
  document.getElementById('summaryTotal').textContent = `$${total.toFixed(2)}`;
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  tbody.innerHTML = products
    .map(
      (p) => `
    <tr>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.category)}</td>
      <td>${escapeHtml(p.unit || '1 Pack')}</td>
      <td>$${Number(p.price).toFixed(2)}</td>
      <td>${p.stock}</td>
      <td>
        <button type="button" class="btn-danger-sm" data-delete-id="${p.id}">Delete</button>
      </td>
    </tr>
  `
    )
    .join('');
}

  subtotalEl.textContent = `$${total.toFixed(2)}`;
function renderOrdersModal() {
  const container = document.getElementById('ordersListContainer');
  if (orders.length === 0) {
    container.innerHTML = `<p style="color:#64748b; text-align:center; padding: 1.5rem;">You haven't placed any grocery orders yet.</p>`;
    return;
  }

  container.innerHTML = orders
    .map(
      (o) => `
    <div class="order-card">
      <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
        <strong>Order #${o.id} — ${escapeHtml(o.customer_name)}</strong>
        <span style="color:#15803d; font-weight:700;">$${Number(o.total_amount).toFixed(2)}</span>
      </div>
      <div style="font-size:0.84rem; color:#475569; margin-bottom:0.3rem;">
        📍 ${escapeHtml(o.delivery_address || o.customer_email || '')} • 📞 ${escapeHtml(o.customer_phone || '')}
      </div>
      <div style="font-size:0.84rem;">🛒 <strong>Items:</strong> ${escapeHtml(o.items_summary)}</div>
      <div style="font-size:0.75rem; color:#94a3b8; margin-top:0.35rem;">Placed on ${escapeHtml(o.created_at)}</div>
    </div>
  `
    )
    .join('');
}

// Helper: Convert uploaded File to Data URL for local S3 simulation
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
  fetchAllData();
  initStore();

  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = `tab-${btn.dataset.tab}`;
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');
    });
  });

  // Search Input
  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderProductsGrid();
    renderProductGrid();
  });

  // Category Chips
  // Sort
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    sortMode = e.target.value;
    renderProductGrid();
  });

  // Category Pills
  document.getElementById('categoryFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-chip');
    if (!btn) return;
    document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.category;
    logAwsActivity('RDS', 'SELECT Filter', `SELECT * FROM products WHERE category = '${activeCategory}';`);
    renderProductsGrid();
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    document.querySelectorAll('.cat-pill').forEach((b) => b.classList.remove('active'));
    pill.classList.add('active');
    activeCategory = pill.dataset.category;
    renderProductGrid();
  });

  // Delegated clicks for Add to Cart & Delete Product
  // Delegated Clicks
  document.body.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('[data-add-cart]');
    const addBtn = e.target.closest('[data-add-id]');
    if (addBtn) {
      addToCart(addBtn.dataset.addCart);
      addToCart(addBtn.dataset.addId);
      return;
    }

    const removeCartBtn = e.target.closest('[data-remove-cart]');
    if (removeCartBtn) {
      const id = Number(removeCartBtn.dataset.removeCart);
      cart = cart.filter((item) => Number(item.id) !== id);
      saveCart();
      renderCartModal();
    const qtyBtn = e.target.closest('[data-qty-id]');
    if (qtyBtn) {
      updateCartItemQty(qtyBtn.dataset.qtyId, Number(qtyBtn.dataset.delta));
      return;
    }

    const delProdBtn = e.target.closest('[data-delete-product]');
    if (delProdBtn) {
      const id = Number(delProdBtn.dataset.deleteProduct);
      const prod = products.find((p) => Number(p.id) === id);
      if (!prod) return;

      if (awsConfig.mode === 'live') {
        await fetch(`${awsConfig.apiBaseUrl}/products/${id}`, { method: 'DELETE' });
    const delBtn = e.target.closest('[data-delete-id]');
    if (delBtn) {
      const id = Number(delBtn.dataset.deleteId);
      if (isServerAvailable) {
        await fetch(`/api/products/${id}`, { method: 'DELETE' }).catch(() => {});
      }
      products = products.filter((p) => Number(p.id) !== id);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

      logAwsActivity('S3', 'DeleteObjectCommand', `Deleted s3://${awsConfig.s3BucketName}/${prod.s3_key}`);
      logAwsActivity('RDS', 'DELETE Query', `DELETE FROM products WHERE id = ${id};`);
      renderAll();
      renderStore();
    }
  });

  // Update S3 key preview when selecting a file
  const fileInput = document.getElementById('prodImageFile');
  fileInput.addEventListener('change', () => {
    const fileName = fileInput.files[0] ? fileInput.files[0].name.replace(/\s+/g, '-').toLowerCase() : 'new-item.png';
    document.getElementById('s3PreviewKey').innerHTML =
      `Target S3 Object Path: <code>s3://${escapeHtml(awsConfig.s3BucketName)}/products/${Date.now()}-${escapeHtml(fileName)}</code>`;
  });

  // Add Product Form (S3 Upload + RDS Insert)
  document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value, 10);
    const description = document.getElementById('prodDescription').value.trim();
    const imageUrlInput = document.getElementById('prodImageUrl').value.trim();
    const file = fileInput.files[0];

    const cleanSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const s3Key = `products/${Date.now()}-${cleanSlug}.${file ? file.name.split('.').pop() : 'svg'}`;

    let finalImageUrl = imageUrlInput;
    if (file) {
      finalImageUrl = await readFileAsDataUrl(file);
    } else if (!finalImageUrl) {
      finalImageUrl = createProductSvg(name.slice(0, 22), '#232f3e', '📦');
    }

    if (awsConfig.mode === 'live') {
      try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('category', category);
        formData.append('price', price);
        formData.append('stock', stock);
        formData.append('description', description);
        if (file) formData.append('image', file);
        else formData.append('image_url', finalImageUrl);

        logAwsActivity('EC2', 'POST /api/products', 'Sending multipart/form-data payload to EC2 server...');
        const response = await fetch(`${awsConfig.apiBaseUrl}/products`, {
          method: 'POST',
          body: formData
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        await fetchAllData();
      } catch (err) {
        alert(`Live API error (${err.message}). Saving in simulated mode instead.`);
      }
  // Promo Code
  document.getElementById('applyPromoBtn').addEventListener('click', () => {
    const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
    if (code === 'FRESH10') {
      promoApplied = true;
      renderCartModal();
      alert('Promo code FRESH10 applied! You received 10% off.');
    } else {
      // Simulated S3 PutObject + RDS INSERT
      logAwsActivity(
        'S3',
        'PutObjectCommand',
        `Uploaded object to s3://${awsConfig.s3BucketName}/${s3Key} (ContentType: ${file ? file.type : 'image/svg+xml'})`
      );

      const newProduct = {
        id: Math.floor(100 + Math.random() * 900),
        name,
        category,
        price,
        stock,
        s3_key: s3Key,
        image_url: finalImageUrl,
        description
      };

      products.unshift(newProduct);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

      logAwsActivity(
        'RDS',
        'INSERT INTO products',
        `INSERT INTO products (name, category, price, stock, s3_key) VALUES ('${name}', '${category}', ${price}, ${stock}, '${s3Key}');`
      );
      renderAll();
      alert('Invalid code. Try FRESH10 for 10% off!');
    }

    e.target.reset();
    alert(`Product "${name}" uploaded to S3 & saved to RDS!`);
  });

  // Reset Demo Data
  document.getElementById('resetDemoDataBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    fetchAllData();
    logAwsActivity('RDS', 'DB Seed Reset', 'Restored default products and orders tables.');
  });
  // Dialogs
  const cartDialog = document.getElementById('cartDialog');
  const manageDialog = document.getElementById('manageDialog');
  const ordersDialog = document.getElementById('ordersDialog');

  // Cart Modal Controls
  const cartDialog = document.getElementById('cartDialog');
  document.getElementById('openCartBtn').addEventListener('click', () => {
    renderCartModal();
    cartDialog.showModal();
  });
  document.getElementById('closeCartBtn').addEventListener('click', () => cartDialog.close());

  // Checkout Form (Creates Order in RDS)
  document.getElementById('openManageBtn').addEventListener('click', () => {
    renderInventoryTable();
    manageDialog.showModal();
  });
  document.getElementById('closeManageBtn').addEventListener('click', () => manageDialog.close());

  document.getElementById('openOrdersBtn').addEventListener('click', () => {
    renderOrdersModal();
    ordersDialog.showModal();
  });
  document.getElementById('closeOrdersBtn').addEventListener('click', () => ordersDialog.close());

  // Checkout Submit
  document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const customerName = document.getElementById('customerName').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const customerAddress = document.getElementById('customerAddress').value.trim();
    const { total } = getCartTotals();
    const itemsSummary = cart.map((i) => `${i.qty}x ${i.name}`).join(', ');

    if (awsConfig.mode === 'live') {
      try {
        await fetch(`${awsConfig.apiBaseUrl}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: customerName,
            customer_email: customerEmail,
            items: cart,
            total_amount: totalAmount
          })
        });
        await fetchAllData();
      } catch (err) {
        console.warn('Fallback to local order creation:', err);
      }
    } else {
      const newOrder = {
        id: Math.floor(5000 + Math.random() * 4999),
        customer_name: customerName,
        customer_email: customerEmail,
        items_summary: itemsSummary,
        total_amount: totalAmount,
        status: 'COMPLETED (RDS)',
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
    const newOrder = {
      id: Math.floor(1000 + Math.random() * 9000),
      customer_name: customerName,
      customer_phone: customerPhone,
      delivery_address: customerAddress,
      items_summary: itemsSummary,
      total_amount: total,
      created_at: new Date().toLocaleString()
    };

      // Decrement RDS stock
      cart.forEach((item) => {
        const prod = products.find((p) => Number(p.id) === Number(item.id));
        if (prod && prod.stock >= item.qty) {
          prod.stock -= item.qty;
        }
      });
    if (isServerAvailable) {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newOrder, items: cart })
      }).catch(() => {});
    }

      orders.unshift(newOrder);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    // Update local stock & orders
    cart.forEach((c) => {
      const p = products.find((item) => Number(item.id) === Number(c.id));
      if (p && p.stock >= c.qty) p.stock -= c.qty;
    });

      logAwsActivity(
        'RDS',
        'BEGIN TRANSACTION',
        `INSERT INTO orders (customer_name, customer_email, total_amount) VALUES ('${customerName}', '${customerEmail}', ${totalAmount.toFixed(2)});`
      );
      logAwsActivity('RDS', 'COMMIT', `Order #${newOrder.id} committed & product stock updated.`);
      renderAll();
    }
    orders.unshift(newOrder);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    cart = [];
    promoApplied = false;
    saveCart();
    e.target.reset();
    cartDialog.close();
    alert(`Order placed! Check the "Orders & RDS Inspector" tab to view the new database record.`);
    renderStore();
    alert(`Thank you, ${customerName}! Your grocery order #${newOrder.id} has been confirmed.`);
  });

  // AWS Config Modal
  const configDialog = document.getElementById('configDialog');
  document.getElementById('openConfigBtn').addEventListener('click', () => {
    document.getElementById('backendMode').value = awsConfig.mode;
    document.getElementById('apiBaseUrl').value = awsConfig.apiBaseUrl;
    document.getElementById('s3BucketName').value = awsConfig.s3BucketName;
    document.getElementById('awsRegion').value = awsConfig.awsRegion;
    configDialog.showModal();
  });
  document.getElementById('closeConfigBtn').addEventListener('click', () => configDialog.close());
  // Add New Grocery Product
  document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value;
    const unit = document.getElementById('prodUnit').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value, 10);
    const badge = document.getElementById('prodBadge').value.trim() || 'Fresh';
    const urlInput = document.getElementById('prodImageUrl').value.trim();
    const fileInput = document.getElementById('prodImageFile');

  document.getElementById('awsConfigForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveConfig({
      mode: document.getElementById('backendMode').value,
      apiBaseUrl: document.getElementById('apiBaseUrl').value.trim() || '/api',
      s3BucketName: document.getElementById('s3BucketName').value.trim() || 'cloudmart-assets-demo',
      awsRegion: document.getElementById('awsRegion').value.trim() || 'ap-southeast-1'
    });
    configDialog.close();
    fetchAllData();
    let imageUrl = urlInput;
    if (fileInput.files && fileInput.files[0]) {
      imageUrl = await readFileAsDataUrl(fileInput.files[0]);
    } else if (!imageUrl) {
      imageUrl = createGrocerySvg(name.slice(0, 22), '#16a34a', '🥗');
    }

    if (isServerAvailable) {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('unit', unit);
      formData.append('price', price);
      formData.append('stock', stock);
      formData.append('badge', badge);
      if (fileInput.files && fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
      } else {
        formData.append('image_url', imageUrl);
      }
      await fetch('/api/products', { method: 'POST', body: formData }).catch(() => {});
      await initStore();
    } else {
      const newProd = {
        id: Date.now(),
        name,
        category,
        unit,
        price,
        stock,
        badge,
        image_url: imageUrl
      };
      products.unshift(newProd);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      renderStore();
    }

    e.target.reset();
    alert(`Added "${name}" to FreshMart Grocery!`);
  });

  // Clear Activity Log
  document.getElementById('clearLogBtn').addEventListener('click', () => {
    document.getElementById('awsActivityLog').innerHTML = '';
  // Reset Default Catalog
  document.getElementById('resetCatalogBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    products = [...DEFAULT_GROCERIES];
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    renderStore();
  });
});

