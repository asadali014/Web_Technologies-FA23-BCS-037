// ── Toggle mobile menu (existing) ──────────────────────────────
function toggleMenu() {
    const nav = document.getElementById('nav');
    nav.classList.toggle('open');
}

// ── Helper: generate star string from rating number ────────────
function generateStars(rate) {
    const full = Math.round(rate);
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= full ? '★' : '☆';
    }
    return stars;
}

// ── Helper: build one product card HTML string ─────────────────
function buildCard(product) {
    // If the image is a relative path starting with 'public', prefix it with '/' if necessary
    // or just let it resolve from the root if we're at the root URL.
    const imgSrc = product.image ? (product.image.startsWith('public/') ? '/' + product.image : product.image) : '';
    const rating = typeof product.rating === 'number' ? product.rating : (product.rating ? product.rating.rate : 0);
    const count = (product.rating && product.rating.count) ? product.rating.count : 0;
    
    return `
        <div class="product-card">
            <img class="api-thumb" src="${imgSrc}" alt="${product.name}">
            <p class="category">${product.category}</p>
            <h3>${product.name}</h3>
            <div class="price-row">
                <span class="price">$${product.price}</span>
            </div>
            <button class="add-cart" data-id="${product._id}" data-name="${product.name}" data-price="${product.price}" data-image="${imgSrc}">Add to Cart</button>
            <button
                class="quick-view"
                data-id="${product._id}"
                data-title="${product.name}"
                data-price="${product.price}"
                data-category="${product.category}"
                data-image="${imgSrc}"
                data-desc="${product.description}"
                data-rate="${rating}"
                data-count="${count}">
                Quick View
            </button>
        </div>
    `;
}

// ── AJAX call using jQuery ─────────────────────────────────────
$(document).ready(function () {

    $.ajax({
        url: '/api/v1/products',
        method: 'GET',
        success: function (response) {
            $('#featured-deals-grid').empty();
            $('#all-products-grid').empty();
            
            let products = response.data || [];
            
            // First 4 products for Featured Deals
            let featuredProducts = products.slice(0, 4);
            featuredProducts.forEach(function (product) {
                $('#featured-deals-grid').append(buildCard(product));
            });
            
            // All fetched products for All Products section
            products.forEach(function (product) {
                $('#all-products-grid').append(buildCard(product));
            });
        },
        error: function () {
            const errorMsg = '<p style="color:red; grid-column: 1/-1; text-align:center;">Failed to load products. Please try again.</p>';
            $('#featured-deals-grid').html(errorMsg);
            $('#all-products-grid').html(errorMsg);
        }
    });

});

// ── Open / Close Quick View Modal ─────────────────────────────
document.addEventListener('click', function (e) {

    if (e.target.classList.contains('quick-view')) {
        const btn = e.target;

        document.getElementById('modal-title').textContent = btn.dataset.title;
        document.getElementById('modal-category').textContent = btn.dataset.category;
        document.getElementById('modal-price').textContent = '$' + btn.dataset.price;
        document.getElementById('modal-desc').textContent = btn.dataset.desc;
        document.getElementById('modal-img').src = btn.dataset.image;
        document.getElementById('modal-img').alt = btn.dataset.title;
        document.getElementById('modal-stars').textContent = generateStars(parseFloat(btn.dataset.rate));
        document.getElementById('modal-rating-val').textContent = btn.dataset.rate;
        document.getElementById('modal-rating-count').textContent = '(' + btn.dataset.count + ' reviews)';

        document.getElementById('qv-modal').classList.add('active');
    }

    if (e.target.id === 'modal-close-btn') {
        document.getElementById('qv-modal').classList.remove('active');
    }

    if (e.target.id === 'qv-modal') {
        document.getElementById('qv-modal').classList.remove('active');
    }

});

// ── Shopping Cart Logic ────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('daraz_cart')) || [];

function updateCartUI() {
    const $cartItems = $('#cart-items');
    const $cartCount = $('#cart-count');
    const $cartTotal = $('#cart-total-price');
    
    $cartItems.empty();
    
    if (cart.length === 0) {
        $cartItems.html('<p class="empty-cart">Your cart is empty.</p>');
        $cartCount.text('0');
        $cartTotal.text('0.00');
        $('#checkout-btn').prop('disabled', true);
        return;
    }

    let total = 0;
    let count = 0;

    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        count += item.quantity;
        
        $cartItems.append(`
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">$${item.price}</div>
                    <div class="cart-item-actions">
                        <button class="qty-btn minus-btn" data-index="${index}">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn plus-btn" data-index="${index}">+</button>
                        <button class="remove-btn" data-index="${index}">Remove</button>
                    </div>
                </div>
            </div>
        `);
    });

    $cartCount.text(count);
    $cartTotal.text(total.toFixed(2));
    $('#checkout-btn').prop('disabled', false);
}

function saveCart() {
    localStorage.setItem('daraz_cart', JSON.stringify(cart));
    updateCartUI();
}

$(document).ready(function() {
    // Initial Render
    updateCartUI();

    // Toggle Sidebar
    $('#cart-icon').on('click', function(e) {
        e.preventDefault();
        $('#cart-sidebar').addClass('open');
    });

    $('#close-cart').on('click', function() {
        $('#cart-sidebar').removeClass('open');
    });

    // Add to Cart
    $(document).on('click', '.add-cart', function() {
        const id = $(this).data('id');
        const name = $(this).data('name');
        const price = parseFloat($(this).data('price'));
        const image = $(this).data('image');

        const existing = cart.find(i => i.product === id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ product: id, name, price, image, quantity: 1 });
        }
        
        saveCart();
        $('#cart-sidebar').addClass('open');
    });

    // Update Quantity & Remove
    $('#cart-items').on('click', '.plus-btn', function() {
        cart[$(this).data('index')].quantity += 1;
        saveCart();
    });

    $('#cart-items').on('click', '.minus-btn', function() {
        const index = $(this).data('index');
        if (cart[index].quantity > 1) {
            cart[index].quantity -= 1;
        } else {
            cart.splice(index, 1);
        }
        saveCart();
    });

    $('#cart-items').on('click', '.remove-btn', function() {
        cart.splice($(this).data('index'), 1);
        saveCart();
    });

    // Checkout
    $('#checkout-btn').on('click', function() {
        if (cart.length === 0) return;

        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Map cart items to what the backend expects
        const orderProducts = cart.map(item => ({
            product: item.product,
            quantity: item.quantity
        }));

        const originalText = $(this).text();
        $(this).text('Processing...').prop('disabled', true);

        $.ajax({
            url: '/orders',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ products: orderProducts, totalAmount: totalAmount }),
            success: function(res) {
                if (res.success) {
                    alert('Order placed successfully! Order ID: ' + res.orderId);
                    cart = [];
                    saveCart();
                    $('#cart-sidebar').removeClass('open');
                } else {
                    alert(res.error || 'Failed to place order.');
                }
            },
            error: function(xhr) {
                if (xhr.status === 401) {
                    alert('Please log in first to place an order.');
                    window.location.href = '/login';
                } else {
                    alert('Failed to place order. Please try again later.');
                }
            },
            complete: () => {
                $('#checkout-btn').text(originalText).prop('disabled', false);
            }
        });
    });
});