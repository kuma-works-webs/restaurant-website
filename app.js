/* ============================================================
   RESTAURANT PLATFORM
   ============================================================ */

const SUPABASE_URL =
    "https://qxfoxzcpltocznfykwcf.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_4J4JonWx9m1cdF_LclRHww_CexgDjpv";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

/* ============================================================
   GLOBAL STATE
   ============================================================ */

let settings = null;
let categories = [];
let products = [];
let orders = [];
let reviews = [];

let cart = JSON.parse(
    localStorage.getItem("restaurant_cart") || "[]"
);

let wishlist = JSON.parse(
    localStorage.getItem("restaurant_wishlist") || "[]"
);

let currentLanguage =
    localStorage.getItem("restaurant_language") || "fr";

let selectedCategory = "all";

let customerLocation = {
    latitude: null,
    longitude: null
};

let lastSuccessfulOrder = null;

let orderChannel = null;

/* ============================================================
   TRANSLATIONS
   ============================================================ */

const UI = {

    fr: {
        navHome: "Accueil",
        navMenu: "Menu",
        navContact: "Contact",
        cart: "Panier",
        reviewsTitle: "Ce que disent nos clients",
        leaveReview: "Laisser un avis",
        contactTitle: "Contact",
        hours: "Horaires",
        followUs: "Nous suivre",
        search: "Rechercher..."
    },

    en: {
        navHome: "Home",
        navMenu: "Menu",
        navContact: "Contact",
        cart: "Cart",
        reviewsTitle: "What our customers say",
        leaveReview: "Leave a review",
        contactTitle: "Contact",
        hours: "Opening hours",
        followUs: "Follow us",
        search: "Search..."
    },

    ar: {
        navHome: "الرئيسية",
        navMenu: "القائمة",
        navContact: "اتصل بنا",
        cart: "السلة",
        reviewsTitle: "آراء عملائنا",
        leaveReview: "أضف تقييماً",
        contactTitle: "اتصل بنا",
        hours: "أوقات العمل",
        followUs: "تابعنا",
        search: "بحث..."
    }

};

/* ============================================================
   HELPERS
   ============================================================ */

const $ = id =>
    document.getElementById(id);

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

function localized(value) {

    if (!value) return "";

    if (typeof value === "string") {
        return value;
    }

    return (
        value[currentLanguage]
        ||
        value.fr
        ||
        value.en
        ||
        value.ar
        ||
        Object.values(value)[0]
        ||
        ""
    );

}

function currency(value) {

    return `${Number(value || 0).toFixed(2)} ${settings?.currency || "MAD"}`;

}

function productPrice(product) {

    if (
        product.sale_price !== null &&
        Number(product.sale_price) > 0 &&
        Number(product.sale_price) < Number(product.price)
    ) {
        return Number(product.sale_price);
    }

    return Number(product.price || 0);

}

function showToast(message, type = "") {

    const box = document.createElement("div");

    box.className =
        `toast ${type}`;

    box.textContent = message;

    $("toastContainer").appendChild(box);

    setTimeout(() => {
        box.remove();
    }, 3500);

}

function openModal(id) {

    const modal = $(id);

    if (!modal) return;

    modal.classList.add("open");

    document.body.classList.add("modal-open");

}

function closeModal(id) {

    const modal = $(id);

    if (!modal) return;

    modal.classList.remove("open");

    if (
        !document.querySelector(".modal.open")
    ) {
        document.body.classList.remove("modal-open");
    }

}

function scrollToTop() {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}

/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        $("footerYear").textContent =
            new Date().getFullYear();

        $("languageSelect").value =
            currentLanguage;

        applyTranslations();

        await loadEverything();

        setupRealtime();

        await checkAdminSession();

    }
);

/* ============================================================
   LOAD DATA
   ============================================================ */

async function loadEverything() {

    try {

        const [
            settingsResult,
            categoriesResult,
            productsResult,
            reviewsResult
        ] = await Promise.all([

            supabaseClient
                .from("site_settings")
                .select("*")
                .eq("id",1)
                .single(),

            supabaseClient
                .from("categories")
                .select("*")
                .order("sort_order",{ascending:true}),

            supabaseClient
                .from("products")
                .select("*")
                .order("sort_order",{ascending:true}),

            supabaseClient
                .from("reviews")
                .select("*")
                .eq("approved",true)
                .order("created_at",{ascending:false})

        ]);

        if (settingsResult.error) {
            throw settingsResult.error;
        }

        settings =
            settingsResult.data;

        categories =
            categoriesResult.data || [];

        products =
            productsResult.data || [];

        reviews =
            reviewsResult.data || [];

        applySettings();

        renderCategories();

        renderProducts();

        renderReviews();

        updateCartUI();

        updateWishlistUI();

        renderPaymentOptions();

    } catch(error) {

        console.error(error);

        showToast(
            "Could not load the restaurant data.",
            "error"
        );

    }

}

/* ============================================================
   SETTINGS
   ============================================================ */

function applySettings() {

    if (!settings) return;

    document.title =
        settings.restaurant_name ||
        "Restaurant";

    $("brandName").textContent =
        settings.restaurant_name ||
        "Restaurant";

    $("footerRestaurantName").textContent =
        settings.restaurant_name ||
        "Restaurant";

    $("footerText").textContent =
        settings.footer_text || "";

    if (settings.logo_url) {

        $("brandLogo").src =
            settings.logo_url;

        $("brandLogo").style.display =
            "block";

    } else {

        $("brandLogo").style.display =
            "none";

    }

    if (settings.favicon_url) {

        $("favicon").href =
            settings.favicon_url;

    }

    document.documentElement.style
        .setProperty(
            "--primary",
            settings.primary_color || "#e85d04"
        );

    document.documentElement.style
        .setProperty(
            "--secondary",
            settings.secondary_color || "#ffba08"
        );

    document.documentElement.style
        .setProperty(
            "--background",
            settings.background_color || "#fffaf4"
        );

    document.body.style.fontFamily =
        settings.font_family ||
        "Inter";

    $("heroEyebrow").textContent =
        localized(settings.hero_eyebrow);

    $("heroTitle").textContent =
        localized(settings.hero_title);

    $("heroDescription").textContent =
        localized(settings.hero_description);

    $("heroButton").textContent =
        localized(settings.hero_button);

    $("productsTitle").textContent =
        localized(settings.products_title);

    const announcement =
        localized(settings.announcement);

    if (announcement.trim()) {

        $("announcementText").textContent =
            announcement;

        $("announcementSection")
            .style.display = "block";

    } else {

        $("announcementSection")
            .style.display = "none";

    }

    if (
        settings.background_image_url
    ) {

        $("heroBackground").style
            .backgroundImage =
            `url("${settings.background_image_url}")`;

    }

    if (settings.phone) {

        $("contactPhone").textContent =
            settings.phone;

        $("contactPhone").href =
            `tel:${settings.phone}`;

    } else {

        $("contactPhone").parentElement
            .style.display = "none";

    }

    if (settings.email) {

        $("contactEmail").textContent =
            settings.email;

        $("contactEmail").href =
            `mailto:${settings.email}`;

    } else {

        $("contactEmail").parentElement
            .style.display = "none";

    }

    $("contactAddress").textContent =
        [
            settings.address,
            settings.city
        ]
        .filter(Boolean)
        .join(", ");

    if (settings.maps_url) {

        $("mapsButton").href =
            settings.maps_url;

        $("mapsButton").style.display =
            "inline-block";

    }

    renderOpeningHours();

    setupSocial(
        "instagramLink",
        settings.instagram
    );

    setupSocial(
        "facebookLink",
        settings.facebook
    );

    setupSocial(
        "tiktokLink",
        settings.tiktok
    );

    $("reviewsSection")
        .style.display =
        settings.show_reviews
            ? ""
            : "none";

}

function setupSocial(id,url) {

    const element = $(id);

    if (!element) return;

    if (url) {

        element.href = url;

        element.style.display =
            "inline-block";

    } else {

        element.style.display =
            "none";

    }

}

function renderOpeningHours() {

    const hours =
        settings?.opening_hours || {};

    const days = [
        ["monday","Lundi"],
        ["tuesday","Mardi"],
        ["wednesday","Mercredi"],
        ["thursday","Jeudi"],
        ["friday","Vendredi"],
        ["saturday","Samedi"],
        ["sunday","Dimanche"]
    ];

    $("openingHours").innerHTML =
        days.map(([key,label]) => {

            const row =
                hours[key] || {};

            return `
                <div class="hours-row">
                    <strong>${label}</strong>
                    <span>${escapeHTML(row.open || "—")}</span>
                    <span>${escapeHTML(row.close || "—")}</span>
                </div>
            `;

        }).join("");

}

/* ============================================================
   LANGUAGE
   ============================================================ */

function changeLanguage(language) {

    currentLanguage =
        ["fr","en","ar"].includes(language)
            ? language
            : "fr";

    localStorage.setItem(
        "restaurant_language",
        currentLanguage
    );

    $("languageSelect").value =
        currentLanguage;

    document.documentElement.lang =
        currentLanguage;

    document.documentElement.dir =
        currentLanguage === "ar"
            ? "rtl"
            : "ltr";

    applyTranslations();

    if (settings) {
        applySettings();
    }

    renderCategories();
    renderProducts();
    renderReviews();
    renderCart();

}

function applyTranslations() {

    document.querySelectorAll(
        "[data-i18n]"
    ).forEach(element => {

        const key =
            element.dataset.i18n;

        if (
            UI[currentLanguage] &&
            UI[currentLanguage][key]
        ) {

            element.textContent =
                UI[currentLanguage][key];

        }

    });

    $("searchInput").placeholder =
        UI[currentLanguage].search;

}

/* ============================================================
   CATEGORIES
   ============================================================ */

function renderCategories() {

    const activeCategories =
        categories
            .filter(category => category.active)
            .sort(
                (a,b) =>
                    Number(a.sort_order || 0)
                    -
                    Number(b.sort_order || 0)
            );

    let html = `
        <button
            class="category-button ${
                selectedCategory === "all"
                    ? "active"
                    : ""
            }"
            onclick="selectCategory('all')"
        >
            ${currentLanguage === "ar"
                ? "الكل"
                : currentLanguage === "en"
                    ? "All"
                    : "Tous"}
        </button>
    `;

    html += activeCategories.map(
        category => `

            <button
                class="category-button ${
                    String(selectedCategory) === String(category.id)
                        ? "active"
                        : ""
                }"
                onclick="selectCategory(${category.id})"
            >
                ${escapeHTML(
                    localized(category.name)
                )}
            </button>

        `
    ).join("");

    $("categoryButtons").innerHTML =
        html;

}

function selectCategory(id) {

    selectedCategory = id;

    renderCategories();

    renderProducts();

}

/* ============================================================
   PRODUCTS
   ============================================================ */

function renderProducts() {

    const search =
        ($("searchInput")?.value || "")
        .trim()
        .toLowerCase();

    let visible =
        products.filter(
            product => product.active
        );

    if (
        selectedCategory !== "all"
    ) {

        visible =
            visible.filter(
                product =>
                    String(product.category_id)
                    ===
                    String(selectedCategory)
            );

    }

    if (search) {

        visible =
            visible.filter(product => {

                const name =
                    localized(product.name)
                    .toLowerCase();

                const description =
                    localized(product.description)
                    .toLowerCase();

                return (
                    name.includes(search)
                    ||
                    description.includes(search)
                );

            });

    }

    if (!visible.length) {

        $("productsGrid").innerHTML =
            "";

        $("emptyProducts")
            .style.display =
            "block";

        return;

    }

    $("emptyProducts")
        .style.display =
        "none";

    $("productsGrid").innerHTML =
        visible.map(
            renderProductCard
        ).join("");

}

function renderProductCard(product) {

    const price =
        productPrice(product);

    const sale =
        product.sale_price !== null
        &&
        Number(product.sale_price) > 0
        &&
        Number(product.sale_price) <
        Number(product.price);

    const favorite =
        wishlist.includes(product.id);

    const soldOut =
        Number(product.stock) <= 0;

    return `

        <article class="product-card">

            <div class="product-image">

                ${
                    product.image_url
                    ?
                    `<img
                        src="${escapeHTML(product.image_url)}"
                        alt="${escapeHTML(
                            localized(product.name)
                        )}"
                        loading="lazy"
                    >`
                    :
                    `<div
                        style="
                            width:100%;
                            height:100%;
                            display:grid;
                            place-items:center;
                            font-size:3rem;
                        "
                    >
                        🍽️
                    </div>`
                }

                ${
                    product.badge
                    ?
                    `<span class="product-badge">
                        ${escapeHTML(product.badge)}
                    </span>`
                    :
                    ""
                }

                <button
                    class="wishlist-button"
                    onclick="toggleWishlist(${product.id})"
                >
                    ${favorite ? "♥" : "♡"}
                </button>

            </div>

            <div class="product-content">

                <h3>
                    ${escapeHTML(
                        localized(product.name)
                    )}
                </h3>

                <p class="product-description">
                    ${escapeHTML(
                        localized(product.description)
                    )}
                </p>

                <div class="product-bottom">

                    <div>

                        <div class="price">

                            ${
                                sale
                                ?
                                `<span class="old-price">
                                    ${currency(product.price)}
                                </span>`
                                :
                                ""
                            }

                            ${currency(price)}

                        </div>

                        <div class="stock-text">

                            ${
                                soldOut
                                ?
                                "Sold out"
                                :
                                `${product.stock} available`
                            }

                        </div>

                    </div>

                    <button
                        class="btn primary"
                        ${
                            soldOut
                            ? "disabled"
                            : ""
                        }
                        onclick="addToCart(${product.id})"
                    >
                        ${
                            soldOut
                            ? "Sold out"
                            : "+"
                        }
                    </button>

                </div>

            </div>

        </article>

    `;

}

/* ============================================================
   CART
   ============================================================ */

function saveCart() {

    localStorage.setItem(
        "restaurant_cart",
        JSON.stringify(cart)
    );

}

function addToCart(productId) {

    const product =
        products.find(
            p => Number(p.id) === Number(productId)
        );

    if (!product) {

        showToast(
            "Product not found.",
            "error"
        );

        return;

    }

    if (!product.active) {

        showToast(
            "Product unavailable.",
            "error"
        );

        return;

    }

    if (Number(product.stock) <= 0) {

        showToast(
            "This product is sold out.",
            "error"
        );

        return;

    }

    const existing =
        cart.find(
            item =>
                Number(item.id)
                ===
                Number(productId)
        );

    if (existing) {

        if (
            existing.quantity >=
            Number(product.stock)
        ) {

            showToast(
                "You cannot add more than available stock.",
                "error"
            );

            return;

        }

        existing.quantity++;

    } else {

        cart.push({
            id: product.id,
            quantity: 1
        });

    }

    saveCart();

    updateCartUI();

    showToast(
        "Added to cart.",
        "success"
    );

}

function changeCartQuantity(
    productId,
    delta
) {

    const product =
        products.find(
            p => Number(p.id) === Number(productId)
        );

    const item =
        cart.find(
            x =>
                Number(x.id)
                ===
                Number(productId)
        );

    if (!product || !item) return;

    item.quantity += delta;

    if (item.quantity <= 0) {

        cart =
            cart.filter(
                x =>
                    Number(x.id)
                    !==
                    Number(productId)
            );

    } else if (
        item.quantity >
        Number(product.stock)
    ) {

        item.quantity =
            Number(product.stock);

        showToast(
            "Stock limit reached.",
            "error"
        );

    }

    saveCart();

    updateCartUI();

    renderCart();

}

function removeFromCart(productId) {

    cart =
        cart.filter(
            item =>
                Number(item.id)
                !==
                Number(productId)
        );

    saveCart();

    updateCartUI();

    renderCart();

}

function cartDetailed() {

    return cart
        .map(item => {

            const product =
                products.find(
                    p =>
                        Number(p.id)
                        ===
                        Number(item.id)
                );

            if (!product) {
                return null;
            }

            return {
                ...product,
                quantity: item.quantity,
                unitPrice: productPrice(product),
                lineTotal:
                    productPrice(product)
                    *
                    item.quantity
            };

        })
        .filter(Boolean);

}

function cartSubtotal() {

    return cartDetailed()
        .reduce(
            (sum,item) =>
                sum + item.lineTotal,
            0
        );

}

function updateCartUI() {

    const quantity =
        cart.reduce(
            (sum,item) =>
                sum + Number(item.quantity),
            0
        );

    $("cartCount").textContent =
        quantity;

    $("wishlistCount").textContent =
        wishlist.length;

}

function openCart() {

    renderCart();

    openModal("cartModal");

}

function renderCart() {

    const items =
        cartDetailed();

    if (!items.length) {

        $("cartItems").innerHTML = `
            <div class="empty-state">
                <h3>Your cart is empty</h3>
                <p>Add something delicious first.</p>
            </div>
        `;

        $("cartSubtotal").textContent =
            currency(0);

        $("cartDelivery").textContent =
            "—";

        $("cartTotal").textContent =
            currency(0);

        return;

    }

    $("cartItems").innerHTML =
        items.map(item => `

            <div class="cart-item">

                ${
                    item.image_url
                    ?
                    `<img
                        src="${escapeHTML(item.image_url)}"
                        alt=""
                    >`
                    :
                    `<div
                        style="
                            width:70px;
                            height:70px;
                            display:grid;
                            place-items:center;
                            background:#eee;
                            border-radius:10px;
                        "
                    >
                        🍽️
                    </div>`
                }

                <div>

                    <strong>
                        ${escapeHTML(
                            localized(item.name)
                        )}
                    </strong>

                    <div>
                        ${currency(item.unitPrice)}
                    </div>

                    <div class="qty-controls">

                        <button
                            onclick="changeCartQuantity(
                                ${item.id},
                                -1
                            )"
                        >
                            −
                        </button>

                        <span>
                            ${item.quantity}
                        </span>

                        <button
                            onclick="changeCartQuantity(
                                ${item.id},
                                1
                            )"
                        >
                            +
                        </button>

                        <button
                            onclick="removeFromCart(${item.id})"
                        >
                            🗑
                        </button>

                    </div>

                </div>

                <strong>
                    ${currency(item.lineTotal)}
                </strong>

            </div>

        `).join("");

    const subtotal =
        cartSubtotal();

    $("cartSubtotal").textContent =
        currency(subtotal);

    $("cartDelivery").textContent =
        "Calculated at checkout";

    $("cartTotal").textContent =
        currency(subtotal);

}

/* ============================================================
   WISHLIST
   ============================================================ */

function saveWishlist() {

    localStorage.setItem(
        "restaurant_wishlist",
        JSON.stringify(wishlist)
    );

}

function toggleWishlist(productId) {

    const id =
        Number(productId);

    if (wishlist.includes(id)) {

        wishlist =
            wishlist.filter(
                x => x !== id
            );

    } else {

        wishlist.push(id);

    }

    saveWishlist();

    updateWishlistUI();

    renderProducts();

}

function updateWishlistUI() {

    $("wishlistCount").textContent =
        wishlist.length;

}

function openWishlist() {

    const items =
        wishlist
            .map(
                id =>
                    products.find(
                        p => Number(p.id) === Number(id)
                    )
            )
            .filter(Boolean);

    if (!items.length) {

        $("wishlistItems").innerHTML = `
            <div class="empty-state">
                Your wishlist is empty.
            </div>
        `;

    } else {

        $("wishlistItems").innerHTML =
            items.map(
                p => `

                    <div class="admin-list-item">

                        <strong>
                            ${escapeHTML(
                                localized(p.name)
                            )}
                        </strong>

                        <p>
                            ${currency(
                                productPrice(p)
                            )}
                        </p>

                        <div class="admin-actions">

                            <button
                                onclick="addToCart(${p.id})"
                            >
                                Add to cart
                            </button>

                            <button
                                onclick="toggleWishlist(${p.id});openWishlist()"
                            >
                                Remove
                            </button>

                        </div>

                    </div>

                `
            ).join("");

    }

    openModal("wishlistModal");

}

/* ============================================================
   CHECKOUT
   ============================================================ */

function openCheckout() {

    if (!cartDetailed().length) {

        showToast(
            "Your cart is empty.",
            "error"
        );

        return;

    }

    closeModal("cartModal");

    renderPaymentOptions();

    updateCheckoutDelivery();

    openModal("checkoutModal");

}

function getFulfillmentMethod() {

    return document.querySelector(
        'input[name="fulfillment"]:checked'
    )?.value || "delivery";

}

function getPaymentMethod() {

    return document.querySelector(
        'input[name="paymentMethod"]:checked'
    )?.value || "cash";

}

function renderPaymentOptions() {

    if (!settings) return;

    let html = "";

    if (settings.cash_enabled) {

        html += `

            <label class="radio-card">

                <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked
                    onchange="updatePaymentUI()"
                >

                <span>
                    💵 Cash
                </span>

            </label>

        `;

    }

    if (
        settings.paypal_enabled &&
        (
            settings.paypal_payment_url ||
            settings.paypal_email
        )
    ) {

        html += `

            <label class="radio-card">

                <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    ${
                        !settings.cash_enabled
                            ? "checked"
                            : ""
                    }
                    onchange="updatePaymentUI()"
                >

                <span>
                    🅿️ PayPal
                </span>

            </label>

        `;

    }

    if (!html) {

        html = `
            <p class="warning-box">
                No payment method is currently available.
                Please contact the restaurant.
            </p>
        `;

    }

    $("paymentOptions").innerHTML =
        html;

    updatePaymentUI();

}

function updatePaymentUI() {

    const method =
        getPaymentMethod();

    if (method === "paypal") {

        $("paypalInstructions")
            .style.display =
            "block";

        $("paypalInstructions")
            .innerHTML = `

                <strong>
                    Pay with PayPal
                </strong>

                <p>
                    ${
                        escapeHTML(
                            settings.paypal_instructions ||
                            "Continue to PayPal to complete your payment."
                        )
                    }
                </p>

                ${
                    settings.paypal_payment_url
                    ?
                    `<a
                        href="${escapeHTML(
                            settings.paypal_payment_url
                        )}"
                        target="_blank"
                        rel="noopener"
                        class="btn primary"
                    >
                        Open PayPal
                    </a>`
                    :
                    ""
                }

            `;

        $("paymentReferenceWrapper")
            .style.display =
            "block";

    } else {

        $("paypalInstructions")
            .style.display =
            "none";

        $("paymentReferenceWrapper")
            .style.display =
            "none";

    }

}

function updateCheckoutDelivery() {

    const fulfillment =
        getFulfillmentMethod();

    const delivery =
        fulfillment === "delivery";

    $("deliveryFields")
        .style.display =
        delivery
            ? "block"
            : "none";

    calculateCheckoutTotals();

}

async function calculateCheckoutTotals() {

    const subtotal =
        cartSubtotal();

    let deliveryFee = 0;

    if (
        getFulfillmentMethod()
        ===
        "delivery"
    ) {

        const distance =
            getCustomerDistance();

        if (
            distance !== null
            &&
            settings?.max_delivery_km > 0
            &&
            distance >
            Number(settings.max_delivery_km)
        ) {

            deliveryFee = NaN;

        } else if (
            distance !== null
        ) {

            deliveryFee =
                calculateLocalDeliveryFee(
                    distance
                );

        } else {

            deliveryFee =
                Number(
                    settings?.delivery_fee || 0
                );

        }

        if (
            Number(settings?.free_delivery_above || 0) > 0
            &&
            subtotal >=
            Number(settings.free_delivery_above)
        ) {

            deliveryFee = 0;

        }

    }

    const total =
        subtotal +
        (
            Number.isFinite(deliveryFee)
                ? deliveryFee
                : 0
        );

    $("checkoutSubtotal").textContent =
        currency(subtotal);

    $("checkoutDelivery").textContent =
        Number.isFinite(deliveryFee)
            ? currency(deliveryFee)
            : "Unavailable";

    $("checkoutTotal").textContent =
        currency(total);

    return {
        subtotal,
        deliveryFee,
        total
    };

}

function getCustomerDistance() {

    if (
        customerLocation.latitude === null
        ||
        customerLocation.longitude === null
    ) {
        return null;
    }

    if (
        settings?.latitude === null
        ||
        settings?.longitude === null
        ||
        settings?.latitude === undefined
        ||
        settings?.longitude === undefined
    ) {
        return null;
    }

    return haversine(
        Number(settings.latitude),
        Number(settings.longitude),
        Number(customerLocation.latitude),
        Number(customerLocation.longitude)
    );

}

function haversine(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;

    const dLat =
        (lat2 - lat1)
        *
        Math.PI / 180;

    const dLon =
        (lon2 - lon1)
        *
        Math.PI / 180;

    const a =
        Math.sin(dLat/2) ** 2
        +
        Math.cos(lat1 * Math.PI / 180)
        *
        Math.cos(lat2 * Math.PI / 180)
        *
        Math.sin(dLon/2) ** 2;

    return (
        R *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1-a)
        )
    );

}

function calculateLocalDeliveryFee(distance) {

    const tiers =
        Array.isArray(settings?.delivery_tiers)
            ? settings.delivery_tiers
            : [];

    const sorted =
        [...tiers].sort(
            (a,b) =>
                Number(a.max_km)
                -
                Number(b.max_km)
        );

    for (const tier of sorted) {

        if (
            distance <=
            Number(tier.max_km)
        ) {

            return Number(tier.fee || 0);

        }

    }

    return Number(
        settings?.delivery_fee || 0
    );

}

function getCustomerLocation() {

    if (!navigator.geolocation) {

        showToast(
            "Geolocation is not supported by this browser.",
            "error"
        );

        return;

    }

    $("locationStatus").textContent =
        "Requesting your location...";

    navigator.geolocation.getCurrentPosition(

        position => {

            customerLocation.latitude =
                position.coords.latitude;

            customerLocation.longitude =
                position.coords.longitude;

            const distance =
                getCustomerDistance();

            if (
                distance !== null &&
                settings.max_delivery_km > 0 &&
                distance >
                Number(settings.max_delivery_km)
            ) {

                $("locationStatus").textContent =
                    `You are approximately ${distance.toFixed(1)} km away. Delivery is unavailable.`;

                showToast(
                    "This location is outside the delivery area.",
                    "error"
                );

            } else {

                $("locationStatus").textContent =
                    distance !== null
                        ?
                        `Location detected — approximately ${distance.toFixed(1)} km away.`
                        :
                        "Location detected.";

                showToast(
                    "Location detected.",
                    "success"
                );

            }

            calculateCheckoutTotals();

        },

        error => {

            console.error(error);

            $("locationStatus").textContent =
                "Location permission was not granted.";

            if (
                settings.require_customer_location
            ) {

                showToast(
                    "Location is required for delivery.",
                    "error"
                );

            }

        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }

    );

}

/* ============================================================
   PLACE ORDER
   ============================================================ */

async function submitOrder(event) {

    event.preventDefault();

    const items =
        cartDetailed();

    if (!items.length) {

        showToast(
            "Your cart is empty.",
            "error"
        );

        return;

    }

    const fulfillment =
        getFulfillmentMethod();

    const payment =
        getPaymentMethod();

    if (
        fulfillment === "delivery"
        &&
        settings.require_customer_location
        &&
        (
            customerLocation.latitude === null
            ||
            customerLocation.longitude === null
        )
    ) {

        showToast(
            "Please allow location access so we can calculate delivery.",
            "error"
        );

        return;

    }

    if (
        fulfillment === "delivery"
        &&
        settings.max_delivery_km > 0
    ) {

        const distance =
            getCustomerDistance();

        if (
            distance !== null
            &&
            distance >
            Number(settings.max_delivery_km)
        ) {

            showToast(
                "This location is outside the delivery area.",
                "error"
            );

            return;

        }

    }

    const button =
        $("submitOrderButton");

    button.disabled = true;

    button.textContent =
        "Sending...";

    try {

        const response =
            await supabaseClient.rpc(
                "place_order",
                {
                    p_customer_name:
                        $("checkoutName").value.trim(),

                    p_phone:
                        $("checkoutPhone").value.trim(),

                    p_email:
                        $("checkoutEmail").value.trim(),

                    p_address:
                        $("checkoutAddress").value.trim(),

                    p_city:
                        $("checkoutCity").value.trim(),

                    p_note:
                        $("checkoutNote").value.trim(),

                    p_items:
                        items.map(item => ({
                            id: item.id,
                            quantity: item.quantity
                        })),

                    p_fulfillment_method:
                        fulfillment,

                    p_payment_method:
                        payment,

                    p_payment_reference:
                        $("paymentReference").value.trim(),

                    p_customer_latitude:
                        customerLocation.latitude,

                    p_customer_longitude:
                        customerLocation.longitude
                }
            );

        if (response.error) {
            throw response.error;
        }

        const result =
            response.data;

        lastSuccessfulOrder =
            result;

        cart = [];

        saveCart();

        updateCartUI();

        renderCart();

        $("checkoutForm").reset();

        customerLocation = {
            latitude: null,
            longitude: null
        };

        closeModal("checkoutModal");

        $("successOrderNumber")
            .textContent =
            result.order_number;

        $("successMessage")
            .textContent =
            payment === "paypal"
                ?
                "Please complete your PayPal payment if you have not already done so."
                :
                "The restaurant has received your order.";

        openModal("successModal");

        if (
            payment === "paypal"
            &&
            settings.paypal_payment_url
        ) {

            window.open(
                settings.paypal_payment_url,
                "_blank",
                "noopener"
            );

        }

    } catch(error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not place the order.",
            "error"
        );

    } finally {

        button.disabled = false;

        button.textContent =
            "Confirmer la commande";

    }

}

/* ============================================================
   WHATSAPP
   ============================================================ */

function sendOrderWhatsApp() {

    if (!lastSuccessfulOrder) return;

    if (!settings?.whatsapp) {

        showToast(
            "WhatsApp is not configured.",
            "error"
        );

        return;

    }

    let phone =
        String(settings.whatsapp)
        .replace(/[^\d]/g,"");

    if (
        phone.startsWith("0")
        &&
        settings.city
    ) {
        /*
          Keep the number as entered if possible.
          Owner should preferably enter international format.
        */
    }

    const message =
        `Hello ${settings.restaurant_name || ""},

I placed an order.

Order number:
${lastSuccessfulOrder.order_number}

Total:
${currency(lastSuccessfulOrder.total)}

Please confirm my order.`;

    const url =
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(
        url,
        "_blank",
        "noopener"
    );

}

/* ============================================================
   REVIEWS
   ============================================================ */

function renderReviews() {

    if (!settings?.show_reviews) return;

    if (!reviews.length) {

        $("reviewsGrid").innerHTML = `
            <div class="empty-state">
                No reviews yet.
            </div>
        `;

        return;

    }

    $("reviewsGrid").innerHTML =
        reviews
            .slice(0,9)
            .map(
                review => `

                    <article class="review-card">

                        <div class="stars">
                            ${"★".repeat(
                                Number(review.rating)
                            )}
                            ${"☆".repeat(
                                5 - Number(review.rating)
                            )}
                        </div>

                        <p>
                            ${escapeHTML(
                                review.text
                            )}
                        </p>

                        <strong>
                            ${escapeHTML(
                                review.customer_name
                            )}
                        </strong>

                    </article>

                `
            )
            .join("");

}

function openReviewModal() {

    openModal("reviewModal");

}

async function submitReview(event) {

    event.preventDefault();

    try {

        const result =
            await supabaseClient
                .from("reviews")
                .insert({
                    customer_name:
                        $("reviewName").value.trim(),

                    rating:
                        Number(
                            $("reviewRating").value
                        ),

                    text:
                        $("reviewText").value.trim(),

                    approved: false
                });

        if (result.error) {
            throw result.error;
        }

        closeModal("reviewModal");

        event.target.reset();

        showToast(
            "Review submitted for approval.",
            "success"
        );

    } catch(error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not submit review.",
            "error"
        );

    }

}

/* ============================================================
   ADMIN LOGIN
   ============================================================ */

function openAdminLogin() {

    openModal("adminLoginModal");

}

async function adminLogin(event) {

    event.preventDefault();

    const email =
        $("adminEmail").value.trim();

    const password =
        $("adminPassword").value;

    try {

        const result =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (result.error) {
            throw result.error;
        }

        const isAdmin =
            await verifyAdmin();

        if (!isAdmin) {

            await supabaseClient.auth.signOut();

            throw new Error(
                "This account is not an administrator."
            );

        }

        closeModal("adminLoginModal");

        openModal("adminModal");

        await refreshAdmin();

        showToast(
            "Admin login successful.",
            "success"
        );

    } catch(error) {

        console.error(error);

        showToast(
            error.message ||
            "Login failed.",
            "error"
        );

    }

}

async function verifyAdmin() {

    const {
        data: {
            user
        }
    } =
        await supabaseClient.auth.getUser();

    if (!user) return false;

    const result =
        await supabaseClient
            .from("admin_users")
            .select("user_id")
            .eq("user_id",user.id)
            .maybeSingle();

    return Boolean(
        result.data &&
        !result.error
    );

}

async function checkAdminSession() {

    const isAdmin =
        await verifyAdmin();

    if (isAdmin) {

        console.log(
            "Administrator session detected."
        );

    }

}

async function adminLogout() {

    await supabaseClient.auth.signOut();

    closeModal("adminModal");

    showToast(
        "Logged out.",
        "success"
    );

}

/* ============================================================
   ADMIN TABS
   ============================================================ */

function showAdminTab(
    tab,
    button
) {

    document.querySelectorAll(
        ".admin-panel"
    ).forEach(panel => {

        panel.classList.remove("active");

    });

    document.querySelectorAll(
        ".admin-tab"
    ).forEach(tabButton => {

        tabButton.classList.remove("active");

    });

    const panel =
        $(`admin-${tab}`);

    if (panel) {
        panel.classList.add("active");
    }

    if (button) {
        button.classList.add("active");
    }

}

/* ============================================================
   ADMIN REFRESH
   ============================================================ */

async function refreshAdmin() {

    if (!(await verifyAdmin())) {

        closeModal("adminModal");

        return;

    }

    await loadEverything();

    await loadAdminOrders();

    await loadReviews();

    fillSettingsForms();

    renderAdminCategories();

    renderAdminProducts();

    renderDeliveryEditor();

    renderPaymentAdmin();

    renderAppearanceAdmin();

    renderDashboard();

}

/* ============================================================
   ADMIN SETTINGS
   ============================================================ */

function fillSettingsForms() {

    if (!settings) return;

    $("sRestaurantName").value =
        settings.restaurant_name || "";

    $("sPhone").value =
        settings.phone || "";

    $("sWhatsapp").value =
        settings.whatsapp || "";

    $("sEmail").value =
        settings.email || "";

    $("sAddress").value =
        settings.address || "";

    $("sCity").value =
        settings.city || "";

    $("sMapsUrl").value =
        settings.maps_url || "";

    $("sCurrency").value =
        settings.currency || "MAD";

    const heroEyebrow =
        settings.hero_eyebrow || {};

    const heroTitle =
        settings.hero_title || {};

    const heroDescription =
        settings.hero_description || {};

    const heroButton =
        settings.hero_button || {};

    $("sHeroEyebrowFr").value =
        heroEyebrow.fr || "";

    $("sHeroEyebrowEn").value =
        heroEyebrow.en || "";

    $("sHeroEyebrowAr").value =
        heroEyebrow.ar || "";

    $("sHeroTitleFr").value =
        heroTitle.fr || "";

    $("sHeroTitleEn").value =
        heroTitle.en || "";

    $("sHeroTitleAr").value =
        heroTitle.ar || "";

    $("sHeroDescriptionFr").value =
        heroDescription.fr || "";

    $("sHeroDescriptionEn").value =
        heroDescription.en || "";

    $("sHeroDescriptionAr").value =
        heroDescription.ar || "";

    $("sHeroButtonFr").value =
        heroButton.fr || "";

    $("sHeroButtonEn").value =
        heroButton.en || "";

    $("sHeroButtonAr").value =
        heroButton.ar || "";

    const announcement =
        settings.announcement || {};

    $("sAnnouncementFr").value =
        announcement.fr || "";

    $("sAnnouncementEn").value =
        announcement.en || "";

    $("sAnnouncementAr").value =
        announcement.ar || "";

    $("sInstagram").value =
        settings.instagram || "";

    $("sFacebook").value =
        settings.facebook || "";

    $("sTiktok").value =
        settings.tiktok || "";

    $("sFooterText").value =
        settings.footer_text || "";

    renderHoursEditor();

}

function renderHoursEditor() {

    const days = [
        ["monday","Monday"],
        ["tuesday","Tuesday"],
        ["wednesday","Wednesday"],
        ["thursday","Thursday"],
        ["friday","Friday"],
        ["saturday","Saturday"],
        ["sunday","Sunday"]
    ];

    const hours =
        settings?.opening_hours || {};

    $("hoursEditor").innerHTML =
        days.map(
            ([key,label]) => {

                const row =
                    hours[key] || {};

                return `

                    <div class="hours-row">

                        <strong>
                            ${label}
                        </strong>

                        <input
                            data-hours-day="${key}"
                            data-hours-field="open"
                            type="time"
                            value="${escapeHTML(
                                row.open || ""
                            )}"
                        >

                        <input
                            data-hours-day="${key}"
                            data-hours-field="close"
                            type="time"
                            value="${escapeHTML(
                                row.close || ""
                            )}"
                        >

                    </div>

                `;

            }
        ).join("");

}

async function saveRestaurantSettings(event) {

    event.preventDefault();

    try {

        const openingHours = {};

        document.querySelectorAll(
            "[data-hours-day]"
        ).forEach(input => {

            const day =
                input.dataset.hoursDay;

            const field =
                input.dataset.hoursField;

            if (!openingHours[day]) {
                openingHours[day] = {};
            }

            openingHours[day][field] =
                input.value;

        });

        const payload = {

            restaurant_name:
                $("sRestaurantName").value.trim(),

            phone:
                $("sPhone").value.trim(),

            whatsapp:
                $("sWhatsapp").value.trim(),

            email:
                $("sEmail").value.trim(),

            address:
                $("sAddress").value.trim(),

            city:
                $("sCity").value.trim(),

            maps_url:
                $("sMapsUrl").value.trim(),

            currency:
                $("sCurrency").value.trim() ||
                "MAD",

            opening_hours:
                openingHours,

            hero_eyebrow: {
                fr: $("sHeroEyebrowFr").value,
                en: $("sHeroEyebrowEn").value,
                ar: $("sHeroEyebrowAr").value
            },

            hero_title: {
                fr: $("sHeroTitleFr").value,
                en: $("sHeroTitleEn").value,
                ar: $("sHeroTitleAr").value
            },

            hero_description: {
                fr: $("sHeroDescriptionFr").value,
                en: $("sHeroDescriptionEn").value,
                ar: $("sHeroDescriptionAr").value
            },

            hero_button: {
                fr: $("sHeroButtonFr").value,
                en: $("sHeroButtonEn").value,
                ar: $("sHeroButtonAr").value
            },

            announcement: {
                fr: $("sAnnouncementFr").value,
                en: $("sAnnouncementEn").value,
                ar: $("sAnnouncementAr").value
            },

            instagram:
                $("sInstagram").value.trim(),

            facebook:
                $("sFacebook").value.trim(),

            tiktok:
                $("sTiktok").value.trim(),

            footer_text:
                $("sFooterText").value.trim()

        };

        const result =
            await supabaseClient
                .from("site_settings")
                .update(payload)
                .eq("id",1);

        if (result.error) {
            throw result.error;
        }

        await loadEverything();

        showToast(
            "Restaurant settings saved permanently.",
            "success"
        );

    } catch(error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not save settings.",
            "error"
        );

    }

}

/* ============================================================
   CATEGORY ADMIN
   ============================================================ */

function openCategoryEditor(id = null) {

    const category =
        id === null
            ? null
            :
            categories.find(
                c =>
                    Number(c.id)
                    ===
                    Number(id)
            );

    $("categoryEditorTitle").textContent =
        category
            ? "Edit Category"
            : "Add Category";

    $("editCategoryId").value =
        category?.id || "";

    $("categoryFr").value =
        category?.name?.fr || "";

    $("categoryEn").value =
        category?.name?.en || "";

    $("categoryAr").value =
        category?.name?.ar || "";

    $("categorySort").value =
        category?.sort_order ?? 0;

    $("categoryActive").checked =
        category
            ? Boolean(category.active)
            : true;

    openModal(
        "categoryEditorModal"
    );

}

async function saveCategory(event) {

    event.preventDefault();

    if (!(await verifyAdmin())) {

        showToast(
            "Admin authentication required.",
            "error"
        );

        return;

    }

    const id =
        $("editCategoryId").value;

    const payload = {

        name: {
            fr:
                $("categoryFr").value.trim(),

            en:
                $("categoryEn").value.trim()
                ||
                $("categoryFr").value.trim(),

            ar:
                $("categoryAr").value.trim()
                ||
                $("categoryFr").value.trim()
        },

        sort_order:
            Number(
                $("categorySort").value || 0
            ),

        active:
            $("categoryActive").checked

    };

    try {

        let result;

        if (id) {

            result =
                await supabaseClient
                    .from("categories")
                    .update(payload)
                    .eq("id",id);

        } else {

            result =
                await supabaseClient
                    .from("categories")
                    .insert(payload);

        }

        if (result.error) {
            throw result.error;
        }

        closeModal(
            "categoryEditorModal"
        );

        await loadEverything();

        renderAdminCategories();

        renderAdminProducts();

        showToast(
            "Category saved permanently.",
            "success"
        );

    } catch(error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not save category.",
            "error"
        );

    }

}

async function deleteCategory(id) {

    if (
        !confirm(
            "Delete this category? Products will remain but become uncategorized."
        )
    ) {
        return;
    }

    try {

        const result =
            await supabaseClient
                .from("categories")
                .delete()
                .eq("id",id);

        if (result.error) {
            throw result.error;
        }

        await loadEverything();

        renderAdminCategories();

        renderAdminProducts();

        showToast(
            "Category deleted.",
            "success"
        );

    } catch(error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not delete category.",
            "error"
        );

    }

}

async function moveCategory(
    id,
    direction
) {

    const sorted =
        [...categories]
            .sort(
                (a,b) =>
                    Number(a.sort_order || 0)
                    -
                    Number(b.sort_order || 0)
            );

    const index =
        sorted.findIndex(
            c =>
                Number(c.id)
                ===
                Number(id)
        );

    const otherIndex =
        index + direction;

    if (
        index < 0 ||
        otherIndex < 0 ||
        otherIndex >= sorted.length
    ) {
        return;
    }

    const current =
        sorted[index];

    const other =
        sorted[otherIndex];

    const currentOrder =
        current.sort_order;

    await Promise.all([

        supabaseClient
            .from("categories")
            .update({
                sort_order:
                    other.sort_order
            })
            .eq("id",current.id),

        supabaseClient
            .from("categories")
            .update({
                sort_order:
                    currentOrder
            })
            .eq("id",other.id)

    ]);

    await loadEverything();

    renderAdminCategories();

}

function renderAdminCategories() {

    const sorted =
        [...categories].sort(
            (a,b) =>
                Number(a.sort_order || 0)
                -
                Number(b.sort_order || 0)
        );

    if (!sorted.length) {

        $("adminCategories").innerHTML =
            `<div class="empty-state">
                No categories yet.
            </div>`;

        return;

    }

    $("adminCategories").innerHTML =
        sorted.map(
            (category,index) => `

                <div class="admin-list-item">

                    <div class="admin-list-main">

                        <div>

                            <strong>
                                ${escapeHTML(
                                    localized(category.name)
                                )}
                            </strong>

                            <div class="small-text">

                                FR:
                                ${escapeHTML(
                                    category.name?.fr || ""
                                )}

                                ·

                                EN:
                                ${escapeHTML(
                                    category.name?.en || ""
                                )}

                                ·

                                AR:
                                ${escapeHTML(
                                    category.name?.ar || ""
                                )}

                            </div>

                        </div>

                        <span>
                            ${
                                category.active
                                ? "Visible"
                                : "Hidden"
                            }
                        </span>

                    </div>

                    <div class="admin-actions">

                        <button
                            onclick="openCategoryEditor(${category.id})"
                        >
                            Edit
                        </button>

                        <button
                            onclick="moveCategory(${category.id},-1)"
                        >
                            ↑
                        </button>

                        <button
                            onclick="moveCategory(${category.id},1)"
                        >
                            ↓
                        </button>

                        <button
                            onclick="toggleCategory(${category.id})"
                        >
                            ${
                                category.active
                                    ? "Hide"
                                    : "Show"
                            }
                        </button>

                        <button
                            onclick="deleteCategory(${category.id})"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            `
        ).join("");

}

async function toggleCategory(id) {

    const category =
        categories.find(
            c =>
                Number(c.id)
                ===
                Number(id)
        );

    if (!category) return;

    const result =
        await supabaseClient
            .from("categories")
            .update({
                active:
                    !category.active
            })
            .eq("id",id);

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    await loadEverything();

    renderAdminCategories();

}

/* ============================================================
   PRODUCT ADMIN
   ============================================================ */

function populateProductCategorySelect() {

    const sorted =
        [...categories]
            .sort(
                (a,b) =>
                    Number(a.sort_order || 0)
                    -
                    Number(b.sort_order || 0)
            );

    $("productCategory").innerHTML =
        `
            <option value="">
                Uncategorized
            </option>
        `
        +
        sorted.map(
            category => `

                <option
                    value="${category.id}"
                >
                    ${escapeHTML(
                        localized(category.name)
                    )}
                </option>

            `
        ).join("");

}

function openProductEditor(id = null) {

    populateProductCategorySelect();

    const product =
        id === null
            ? null
            :
            products.find(
                p =>
                    Number(p.id)
                    ===
                    Number(id)
            );

    $("productEditorTitle").textContent =
        product
            ? "Edit Product"
            : "Add Product";

    $("editProductId").value =
        product?.id || "";

    $("productNameFr").value =
        product?.name?.fr || "";

    $("productNameEn").value =
        product?.name?.en || "";

    $("productNameAr").value =
        product?.name?.ar || "";

    $("productDescFr").value =
        product?.description?.fr || "";

    $("productDescEn").value =
        product?.description?.en || "";

    $("productDescAr").value =
        product?.description?.ar || "";

    $("productCategory").value =
        product?.category_id || "";

    $("productPrice").value =
        product?.price ?? "";

    $("productSalePrice").value =
        product?.sale_price ?? "";

    $("productStock").value =
        product?.stock ?? 0;

    $("productBadge").value =
        product?.badge || "";

    $("productSort").value =
        product?.sort_order ?? 0;

    $("productImageUrl").value =
        product?.image_url || "";

    $("productActive").checked =
        product
            ? Boolean(product.active)
            : true;

    openModal(
        "productEditorModal"
    );

}

async function saveProduct(event) {

    event.preventDefault();

    if (!(await verifyAdmin())) {

        showToast(
            "Admin authentication required.",
            "error"
        );

        return;

    }

    const id =
        $("editProductId").value;

    const price =
        Number(
            $("productPrice").value
        );

    const saleRaw =
        $("productSalePrice").value;

    const sale =
        saleRaw === ""
            ? null
            : Number(saleRaw);

    if (
        !Number.isFinite(price)
        ||
        price < 0
    ) {

        showToast(
            "Invalid price.",
            "error"
        );

        return;

    }

    if (
        sale !== null
        &&
        (
            !Number.isFinite(sale)
            ||
            sale < 0
            ||
            sale >= price
        )
    ) {

        showToast(
            "Sale price must be lower than the normal price.",
            "error"
        );

        return;

    }

    const payload = {

        category_id:
            $("productCategory").value
                ?
                Number(
                    $("productCategory").value
                )
                :
                null,

        name: {

            fr:
                $("productNameFr")
                    .value
                    .trim(),

            en:
                $("productNameEn")
                    .value
                    .trim()
                ||
                $("productNameFr")
                    .value
                    .trim(),

            ar:
                $("productNameAr")
                    .value
                    .trim()
                ||
                $("productNameFr")
                    .value
                    .trim()

        },

        description: {

            fr:
                $("productDescFr")
                    .value
                    .trim(),

            en:
                $("productDescEn")
                    .value
                    .trim(),

            ar:
                $("productDescAr")
                    .value
                    .trim()

        },

        price,

        sale_price: sale,

        image_url:
            $("productImageUrl")
                .value
                .trim()
            ||
            null,

        active:
            $("productActive")
                .checked,

        stock:
            Math.max(
                0,
                Number(
                    $("productStock").value || 0
                )
            ),

        badge:
            $("productBadge").value
            ||
            null,

        sort_order:
            Number(
                $("productSort").value || 0
            )

    };

    try {

        let result;

        if (id) {

            result =
                await supabaseClient
                    .from("products")
                    .update(payload)
                    .eq("id",id);

        } else {

            result =
                await supabaseClient
                    .from("products")
                    .insert(payload);

        }

        if (result.error) {
            throw result.error;
        }

        closeModal(
            "productEditorModal"
        );

        await loadEverything();

        renderAdminProducts();

        showToast(
            "Product saved permanently.",
            "success"
        );

    } catch(error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not save product.",
            "error"
        );

    }

}

async function deleteProduct(id) {

    if (
        !confirm(
            "Delete this product permanently?"
        )
    ) {
        return;
    }

    const result =
        await supabaseClient
            .from("products")
            .delete()
            .eq("id",id);

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    await loadEverything();

    renderAdminProducts();

    showToast(
        "Product deleted.",
        "success"
    );

}

async function toggleProduct(id) {

    const product =
        products.find(
            p =>
                Number(p.id)
                ===
                Number(id)
        );

    if (!product) return;

    const result =
        await supabaseClient
            .from("products")
            .update({
                active:
                    !product.active
            })
            .eq("id",id);

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    await loadEverything();

    renderAdminProducts();

}

async function moveProduct(
    id,
    direction
) {

    const sorted =
        [...products].sort(
            (a,b) =>
                Number(a.sort_order || 0)
                -
                Number(b.sort_order || 0)
        );

    const index =
        sorted.findIndex(
            p =>
                Number(p.id)
                ===
                Number(id)
        );

    const otherIndex =
        index + direction;

    if (
        index < 0
        ||
        otherIndex < 0
        ||
        otherIndex >= sorted.length
    ) {
        return;
    }

    const current =
        sorted[index];

    const other =
        sorted[otherIndex];

    const currentOrder =
        current.sort_order;

    await Promise.all([

        supabaseClient
            .from("products")
            .update({
                sort_order:
                    other.sort_order
            })
            .eq("id",current.id),

        supabaseClient
            .from("products")
            .update({
                sort_order:
                    currentOrder
            })
            .eq("id",other.id)

    ]);

    await loadEverything();

    renderAdminProducts();

}

function renderAdminProducts() {

    const sorted =
        [...products].sort(
            (a,b) =>
                Number(a.sort_order || 0)
                -
                Number(b.sort_order || 0)
        );

    if (!sorted.length) {

        $("adminProducts").innerHTML =
            `
                <div class="empty-state">
                    No products yet.
                </div>
            `;

        return;

    }

    $("adminProducts").innerHTML =
        sorted.map(
            product => {

                const category =
                    categories.find(
                        c =>
                            Number(c.id)
                            ===
                            Number(
                                product.category_id
                            )
                    );

                return `

                    <div class="admin-list-item">

                        <div class="admin-list-main">

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        localized(product.name)
                                    )}
                                </strong>

                                <div class="small-text">

                                    Category:
                                    ${
                                        category
                                        ?
                                        escapeHTML(
                                            localized(
                                                category.name
                                            )
                                        )
                                        :
                                        "Uncategorized"
                                    }

                                </div>

                                <div>

                                    ${
                                        product.sale_price
                                        ?
                                        `<span class="old-price">
                                            ${currency(product.price)}
                                        </span>`
                                        :
                                        ""
                                    }

                                    <strong>
                                        ${currency(
                                            productPrice(product)
                                        )}
                                    </strong>

                                </div>

                                <div class="small-text">
                                    Stock:
                                    ${product.stock}
                                </div>

                            </div>

                            <span>
                                ${
                                    product.active
                                    ? "Visible"
                                    : "Hidden"
                                }
                            </span>

                        </div>

                        <div class="admin-actions">

                            <button
                                onclick="openProductEditor(${product.id})"
                            >
                                Edit
                            </button>

                            <button
                                onclick="moveProduct(${product.id},-1)"
                            >
                                ↑
                            </button>

                            <button
                                onclick="moveProduct(${product.id},1)"
                            >
                                ↓
                            </button>

                            <button
                                onclick="toggleProduct(${product.id})"
                            >
                                ${
                                    product.active
                                        ? "Hide"
                                        : "Show"
                                }
                            </button>

                            <button
                                onclick="deleteProduct(${product.id})"
                            >
                                Delete
                            </button>

                        </div>

                    </div>

                `;

            }
        ).join("");

}

/* ============================================================
   DELIVERY ADMIN
   ============================================================ */

function renderDeliveryEditor() {

    $("dDeliveryEnabled").checked =
        Boolean(settings.delivery_enabled);

    $("dPickupEnabled").checked =
        Boolean(settings.pickup_enabled);

    $("dRequireLocation").checked =
        Boolean(settings.require_customer_location);

    $("dLatitude").value =
        settings.latitude ?? "";

    $("dLongitude").value =
        settings.longitude ?? "";

    $("dMaxKm").value =
        settings.max_delivery_km ?? 10;

    $("dDefaultFee").value =
        settings.delivery_fee ?? 0;

    $("dFreeAbove").value =
        settings.free_delivery_above ?? 0;

    $("dMinimumOrder").value =
        settings.minimum_order ?? 0;

    renderDeliveryTiers();

}

function renderDeliveryTiers() {

    const tiers =
        Array.isArray(settings.delivery_tiers)
            ?
            settings.delivery_tiers
            :
            [];

    $("deliveryTiersEditor").innerHTML =
        tiers.map(
            (tier,index) => `

                <div class="delivery-tier">

                    <label>
                        Up to km
                        <input
                            data-tier-km="${index}"
                            type="number"
                            min="0"
                            step="0.1"
                            value="${Number(
                                tier.max_km || 0
                            )}"
                        >
                    </label>

                    <label>
                        Fee
                        <input
                            data-tier-fee="${index}"
                            type="number"
                            min="0"
                            step="0.01"
                            value="${Number(
                                tier.fee || 0
                            )}"
                        >
                    </label>

                    <button
                        type="button"
                        onclick="removeDeliveryTier(${index})"
                    >
                        Delete
                    </button>

                </div>

            `
        ).join("");

}

function addDeliveryTier() {

    if (!Array.isArray(settings.delivery_tiers)) {
        settings.delivery_tiers = [];
    }

    settings.delivery_tiers.push({
        max_km: 5,
        fee: 15
    });

    renderDeliveryTiers();

}

function removeDeliveryTier(index) {

    settings.delivery_tiers.splice(
        index,
        1
    );

    renderDeliveryTiers();

}

function useRestaurantLocation() {

    if (!navigator.geolocation) {

        showToast(
            "Geolocation is not supported.",
            "error"
        );

        return;

    }

    navigator.geolocation.getCurrentPosition(

        position => {

            $("dLatitude").value =
                position.coords.latitude;

            $("dLongitude").value =
                position.coords.longitude;

            showToast(
                "Restaurant location detected.",
                "success"
            );

        },

        error => {

            console.error(error);

            showToast(
                "Could not get location.",
                "error"
            );

        },

        {
            enableHighAccuracy:true,
            timeout:10000
        }

    );

}

async function saveDeliverySettings(event) {

    event.preventDefault();

    try {

        const tiers = [];

        document.querySelectorAll(
            "[data-tier-km]"
        ).forEach(input => {

            const index =
                Number(
                    input.dataset.tierKm
                );

            if (!tiers[index]) {
                tiers[index] = {};
            }

            tiers[index].max_km =
                Number(input.value || 0);

        });

        document.querySelectorAll(
            "[data-tier-fee]"
        ).forEach(input => {

            const index =
                Number(
                    input.dataset.tierFee
                );

            if (!tiers[index]) {
                tiers[index] = {};
            }

            tiers[index].fee =
                Number(input.value || 0);

        });

        const cleanTiers =
            tiers
                .filter(
                    tier =>
                        Number(tier.max_km) > 0
                )
                .sort(
                    (a,b) =>
                        Number(a.max_km)
                        -
                        Number(b.max_km)
                );

        const payload = {

            delivery_enabled:
                $("dDeliveryEnabled")
                    .checked,

            pickup_enabled:
                $("dPickupEnabled")
                    .checked,

            require_customer_location:
                $("dRequireLocation")
                    .checked,

            latitude:
                $("dLatitude").value === ""
                    ? null
                    : Number(
                        $("dLatitude").value
                    ),

            longitude:
                $("dLongitude").value === ""
                    ? null
                    : Number(
                        $("dLongitude").value
                    ),

            max_delivery_km:
                Number(
                    $("dMaxKm").value || 0
                ),

            delivery_fee:
                Number(
                    $("dDefaultFee").value || 0
                ),

            free_delivery_above:
                Number(
                    $("dFreeAbove").value || 0
                ),

            minimum_order:
                Number(
                    $("dMinimumOrder").value || 0
                ),

            delivery_tiers:
                cleanTiers

        };

        const result =
            await supabaseClient
                .from("site_settings")
                .update(payload)
                .eq("id",1);

        if (result.error) {
            throw result.error;
        }

        await loadEverything();

        renderDeliveryEditor();

        showToast(
            "Delivery settings saved permanently.",
            "success"
        );

    } catch(error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not save delivery settings.",
            "error"
        );

    }

}

/* ============================================================
   PAYMENT ADMIN
   ============================================================ */

function renderPaymentAdmin() {

    $("pPaypalEnabled").checked =
        Boolean(settings.paypal_enabled);

    $("pPaypalEmail").value =
        settings.paypal_email || "";

    $("pPaypalUrl").value =
        settings.paypal_payment_url || "";

    $("pPaypalInstructions").value =
        settings.paypal_instructions || "";

    $("pCashEnabled").checked =
        Boolean(settings.cash_enabled);

}

async function savePaymentSettings(event) {

    event.preventDefault();

    const paypalEmail =
        $("pPaypalEmail").value.trim();

    const paypalUrl =
        $("pPaypalUrl").value.trim();

    if (
        $("pPaypalEnabled").checked
        &&
        !paypalEmail
        &&
        !paypalUrl
    ) {

        showToast(
            "Add a PayPal email or PayPal payment URL first.",
            "error"
        );

        return;

    }

    try {

        const payload = {

            paypal_enabled:
                $("pPaypalEnabled").checked,

            paypal_email:
                paypalEmail || null,

            paypal_payment_url:
                paypalUrl || null,

            paypal_instructions:
                $("pPaypalInstructions")
                    .value
                    .trim(),

            cash_enabled:
                $("pCashEnabled")
                    .checked

        };

        const result =
            await supabaseClient
                .from("site_settings")
                .update(payload)
                .eq("id",1);

        if (result.error) {
            throw result.error;
        }

        await loadEverything();

        renderPaymentAdmin();

        showToast(
            "Payment settings saved permanently.",
            "success"
        );

    } catch(error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not save payment settings.",
            "error"
        );

    }

}

/* ============================================================
   APPEARANCE
   ============================================================ */

function renderAppearanceAdmin() {

    $("aPrimaryColor").value =
        settings.primary_color ||
        "#e85d04";

    $("aSecondaryColor").value =
        settings.secondary_color ||
        "#ffba08";

    $("aBackgroundColor").value =
        settings.background_color ||
        "#fffaf4";

    $("aFontFamily").value =
        settings.font_family ||
        "Inter";

    $("aLogoUrl").value =
        settings.logo_url || "";

    $("aFaviconUrl").value =
        settings.favicon_url || "";

    $("aBackgroundImage").value =
        settings.background_image_url ||
        "";

    $("aBackgroundVideo").value =
        settings.background_video_url ||
        "";

}

async function saveAppearance(event) {

    event.preventDefault();

    try {

        const payload = {

            primary_color:
                $("aPrimaryColor").value,

            secondary_color:
                $("aSecondaryColor").value,

            background_color:
                $("aBackgroundColor").value,

            font_family:
                $("aFontFamily").value,

            logo_url:
                $("aLogoUrl").value.trim()
                ||
                null,

            favicon_url:
                $("aFaviconUrl").value.trim()
                ||
                null,

            background_image_url:
                $("aBackgroundImage")
                    .value
                    .trim()
                ||
                null,

            background_video_url:
                $("aBackgroundVideo")
                    .value
                    .trim()
                ||
                null

        };

        const result =
            await supabaseClient
                .from("site_settings")
                .update(payload)
                .eq("id",1);

        if (result.error) {
            throw result.error;
        }

        await loadEverything();

        renderAppearanceAdmin();

        showToast(
            "Appearance saved permanently.",
            "success"
        );

    } catch(error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not save appearance.",
            "error"
        );

    }

}

/* ============================================================
   ADMIN ORDERS
   ============================================================ */

async function loadAdminOrders() {

    if (!(await verifyAdmin())) return;

    const result =
        await supabaseClient
            .from("orders")
            .select("*")
            .order(
                "created_at",
                {ascending:false}
            );

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    orders =
        result.data || [];

    renderAdminOrders();

    renderDashboard();

}

function renderAdminOrders() {

    const filter =
        $("orderFilter")?.value ||
        "all";

    let filtered =
        [...orders];

    if (filter !== "all") {

        filtered =
            filtered.filter(
                order =>
                    order.status === filter
            );

    }

    if (!filtered.length) {

        $("adminOrders").innerHTML =
            `
                <div class="empty-state">
                    No orders found.
                </div>
            `;

        return;

    }

    $("adminOrders").innerHTML =
        filtered.map(
            order => {

                const items =
                    Array.isArray(order.items)
                        ? order.items
                        : [];

                return `

                    <div class="admin-list-item">

                        <div class="admin-list-main">

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        order.order_number
                                    )}
                                </strong>

                                <div>
                                    ${escapeHTML(
                                        order.customer_name
                                    )}
                                </div>

                                <div>
                                    📞
                                    ${escapeHTML(
                                        order.phone
                                    )}
                                </div>

                                <div class="small-text">
                                    ${
                                        new Date(
                                            order.created_at
                                        ).toLocaleString()
                                    }
                                </div>

                            </div>

                            <strong>
                                ${currency(order.total)}
                            </strong>

                        </div>

                        <div class="order-details">

                            <div>
                                <strong>
                                    Items
                                </strong>
                            </div>

                            ${items.map(
                                item => `

                                    <div class="order-product">

                                        <span>
                                            ${escapeHTML(
                                                localized(
                                                    item.name
                                                )
                                            )}
                                            ×
                                            ${item.quantity}
                                        </span>

                                        <strong>
                                            ${currency(
                                                Number(item.price)
                                                *
                                                Number(item.quantity)
                                            )}
                                        </strong>

                                    </div>

                                `
                            ).join("")}

                            <hr>

                            <div>
                                Payment:
                                <strong>
                                    ${escapeHTML(
                                        order.payment_method
                                    )}
                                </strong>

                                ·

                                ${
                                    escapeHTML(
                                        order.payment_status
                                    )
                                }
                            </div>

                            <div>
                                ${
                                    order.fulfillment_method
                                }
                                ${
                                    order.delivery_distance_km !== null
                                    ?
                                    ` · ${Number(
                                        order.delivery_distance_km
                                    ).toFixed(1)} km`
                                    :
                                    ""
                                }
                            </div>

                            ${
                                order.address
                                ?
                                `<div>
                                    📍
                                    ${escapeHTML(
                                        order.address
                                    )}
                                    ${
                                        order.city
                                        ?
                                        `, ${escapeHTML(
                                            order.city
                                        )}`
                                        :
                                        ""
                                    }
                                </div>`
                                :
                                ""
                            }

                            ${
                                order.note
                                ?
                                `<div>
                                    Note:
                                    ${escapeHTML(
                                        order.note
                                    )}
                                </div>`
                                :
                                ""
                            }

                        </div>

                        <div class="admin-actions">

                            <select
                                class="status-select"
                                onchange="updateOrderStatus(
                                    ${order.id},
                                    this.value
                                )"
                            >

                                ${
                                    [
                                        "pending",
                                        "confirmed",
                                        "preparing",
                                        "ready",
                                        "completed",
                                        "cancelled"
                                    ]
                                    .map(
                                        status => `

                                            <option
                                                value="${status}"
                                                ${
                                                    order.status === status
                                                    ? "selected"
                                                    : ""
                                                }
                                            >
                                                ${status}
                                            </option>

                                        `
                                    )
                                    .join("")
                                }

                            </select>

                            <select
                                class="status-select"
                                onchange="updatePaymentStatus(
                                    ${order.id},
                                    this.value
                                )"
                            >

                                ${
                                    [
                                        "unpaid",
                                        "pending",
                                        "paid",
                                        "failed"
                                    ]
                                    .map(
                                        status => `

                                            <option
                                                value="${status}"
                                                ${
                                                    order.payment_status === status
                                                    ? "selected"
                                                    : ""
                                                }
                                            >
                                                Payment:
                                                ${status}
                                            </option>

                                        `
                                    )
                                    .join("")
                                }

                            </select>

                            <button
                                onclick="deleteOrder(${order.id})"
                            >
                                Delete
                            </button>

                        </div>

                    </div>

                `;

            }
        ).join("");

}

async function updateOrderStatus(
    id,
    status
) {

    const result =
        await supabaseClient
            .from("orders")
            .update({
                status
            })
            .eq("id",id);

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    const order =
        orders.find(
            o => Number(o.id) === Number(id)
        );

    if (order) {
        order.status = status;
    }

    renderAdminOrders();

    renderDashboard();

}

async function updatePaymentStatus(
    id,
    payment_status
) {

    const result =
        await supabaseClient
            .from("orders")
            .update({
                payment_status
            })
            .eq("id",id);

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    const order =
        orders.find(
            o => Number(o.id) === Number(id)
        );

    if (order) {
        order.payment_status =
            payment_status;
    }

    renderAdminOrders();

}

async function deleteOrder(id) {

    if (
        !confirm(
            "Delete this order?"
        )
    ) {
        return;
    }

    const result =
        await supabaseClient
            .from("orders")
            .delete()
            .eq("id",id);

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    orders =
        orders.filter(
            order =>
                Number(order.id)
                !==
                Number(id)
        );

    renderAdminOrders();

    renderDashboard();

}

/* ============================================================
   DASHBOARD
   ============================================================ */

function renderDashboard() {

    const totalOrders =
        orders.length;

    const revenue =
        orders
            .filter(
                order =>
                    order.status !== "cancelled"
            )
            .reduce(
                (sum,order) =>
                    sum +
                    Number(order.total || 0),
                0
            );

    const pending =
        orders.filter(
            order =>
                order.status === "pending"
        ).length;

    const lowStock =
        products.filter(
            product =>
                Number(product.stock) <= 5
        ).length;

    $("statOrders").textContent =
        totalOrders;

    $("statRevenue").textContent =
        currency(revenue);

    $("statPending").textContent =
        pending;

    $("statLowStock").textContent =
        lowStock;

    $("recentOrders").innerHTML =
        orders
            .slice(0,8)
            .map(
                order => `

                    <div class="admin-list-item">

                        <div class="admin-list-main">

                            <span>
                                <strong>
                                    ${escapeHTML(
                                        order.order_number
                                    )}
                                </strong>

                                <br>

                                ${escapeHTML(
                                    order.customer_name
                                )}

                            </span>

                            <strong>
                                ${currency(order.total)}
                            </strong>

                        </div>

                        <div class="small-text">
                            ${order.status}
                        </div>

                    </div>

                `
            )
            .join("")
        ||
        `
            <div class="empty-state">
                No orders yet.
            </div>
        `;

    $("lowStockProducts").innerHTML =
        products
            .filter(
                product =>
                    Number(product.stock) <= 5
            )
            .map(
                product => `

                    <div class="admin-list-item">

                        <strong>
                            ${escapeHTML(
                                localized(product.name)
                            )}
                        </strong>

                        <span>
                            Stock:
                            ${product.stock}
                        </span>

                    </div>

                `
            )
            .join("")
        ||
        `
            <div class="empty-state">
                No low-stock products.
            </div>
        `;

}

/* ============================================================
   ADMIN REVIEWS
   ============================================================ */

async function loadReviews() {

    const isAdmin =
        await verifyAdmin();

    if (!isAdmin) return;

    const result =
        await supabaseClient
            .from("reviews")
            .select("*")
            .order(
                "created_at",
                {ascending:false}
            );

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    const adminReviews =
        result.data || [];

    $("adminReviews").innerHTML =
        adminReviews.map(
            review => `

                <div class="admin-list-item">

                    <div class="stars">
                        ${"★".repeat(
                            review.rating
                        )}
                        ${"☆".repeat(
                            5 - review.rating
                        )}
                    </div>

                    <strong>
                        ${escapeHTML(
                            review.customer_name
                        )}
                    </strong>

                    <p>
                        ${escapeHTML(
                            review.text
                        )}
                    </p>

                    <div class="admin-actions">

                        <button
                            onclick="toggleReviewApproval(
                                ${review.id},
                                ${!review.approved}
                            )"
                        >
                            ${
                                review.approved
                                ? "Unapprove"
                                : "Approve"
                            }
                        </button>

                        <button
                            onclick="deleteReview(${review.id})"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            `
        ).join("")
        ||
        `
            <div class="empty-state">
                No reviews.
            </div>
        `;

}

async function toggleReviewApproval(
    id,
    approved
) {

    const result =
        await supabaseClient
            .from("reviews")
            .update({
                approved
            })
            .eq("id",id);

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    await loadEverything();

    await loadReviews();

}

async function deleteReview(id) {

    if (!confirm("Delete this review?")) {
        return;
    }

    const result =
        await supabaseClient
            .from("reviews")
            .delete()
            .eq("id",id);

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    await loadEverything();

    await loadReviews();

}

/* ============================================================
   REALTIME ORDERS
   ============================================================ */

function setupRealtime() {

    if (orderChannel) {

        supabaseClient
            .removeChannel(orderChannel);

    }

    orderChannel =
        supabaseClient
            .channel(
                "restaurant-orders"
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders"
                },
                async payload => {

                    console.log(
                        "Order realtime event:",
                        payload
                    );

                    const isAdmin =
                        await verifyAdmin();

                    if (!isAdmin) return;

                    playOrderNotification();

                    await loadAdminOrders();

                }
            )
            .subscribe();

}

function playOrderNotification() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) return;

        const audio =
            new AudioContext();

        const oscillator =
            audio.createOscillator();

        const gain =
            audio.createGain();

        oscillator.connect(gain);

        gain.connect(
            audio.destination
        );

        oscillator.frequency.value =
            880;

        gain.gain.value =
            .08;

        oscillator.start();

        setTimeout(() => {

            oscillator.stop();

            audio.close();

        },350);

    } catch(error) {

        console.log(
            "Notification sound unavailable."
        );

    }

}

/* ============================================================
   CLOSE MODAL WHEN CLICKING BACKDROP
   ============================================================ */

document.addEventListener(
    "click",
    event => {

        if (
            event.target.classList.contains(
                "modal"
            )
        ) {

            event.target.classList.remove(
                "open"
            );

            if (
                !document.querySelector(
                    ".modal.open"
                )
            ) {

                document.body.classList
                    .remove("modal-open");

            }

        }

    }
);
