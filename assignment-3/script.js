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
    return `
        <div class="product-card">
            <img class="api-thumb" src="${product.image}" alt="${product.title}">
            <p class="category">${product.category}</p>
            <h3>${product.title}</h3>
            <div class="price-row">
                <span class="price">$${product.price}</span>
            </div>
            <button class="add-cart">Add to Cart</button>
            <button
                class="quick-view"
                data-id="${product.id}"
                data-title="${product.title}"
                data-price="${product.price}"
                data-category="${product.category}"
                data-image="${product.image}"
                data-desc="${product.description}"
                data-rate="${product.rating.rate}"
                data-count="${product.rating.count}">
                Quick View
            </button>
        </div>
    `;
}

// ── AJAX call using jQuery ─────────────────────────────────────
$(document).ready(function () {

    $.ajax({
        url: 'https://fakestoreapi.com/products?limit=4',
        method: 'GET',
        success: function (products) {
            $('#featured-deals-grid').empty();
            products.forEach(function (product) {
                $('#featured-deals-grid').append(buildCard(product));
            });
        },
        error: function () {
            $('#featured-deals-grid').html(
                '<p style="color:red; grid-column: 1/-1; text-align:center;">Failed to load deals. Please try again.</p>'
            );
        }
    });

});

// ── Open / Close Quick View Modal ─────────────────────────────
document.addEventListener('click', function (e) {

    if (e.target.classList.contains('quick-view')) {
        const btn = e.target;

        document.getElementById('modal-title').textContent       = btn.dataset.title;
        document.getElementById('modal-category').textContent    = btn.dataset.category;
        document.getElementById('modal-price').textContent       = '$' + btn.dataset.price;
        document.getElementById('modal-desc').textContent        = btn.dataset.desc;
        document.getElementById('modal-img').src                 = btn.dataset.image;
        document.getElementById('modal-img').alt                 = btn.dataset.title;
        document.getElementById('modal-stars').textContent       = generateStars(parseFloat(btn.dataset.rate));
        document.getElementById('modal-rating-val').textContent  = btn.dataset.rate;
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