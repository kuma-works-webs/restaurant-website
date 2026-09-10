/* =========================================================
   SUPABASE CONFIG
========================================================= */

/*
    PUT YOUR SUPABASE INFORMATION HERE.

    NEVER put a service_role or secret key here.

    Use:
    - Project URL
    - Publishable key / anon key
*/

const SUPABASE_URL =
    "https://qxfoxzcpltocznfykwcf.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_4J4JonWx9m1cdF_LclRHww_CexgDjpv";


const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================================
   GLOBAL STATE
========================================================= */

let settings = null;

let translations = {};

let categories = [];

let products = [];

let orders = [];

let cart = [];

let currentLanguage = "fr";

let selectedCategory = "all";

let currentUser = null;


/* =========================================================
   HELPERS
========================================================= */

function $(id) {

    return document.getElementById(id);

}


function escapeHTML(value) {

    if (value === null || value === undefined) {

        return "";

    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function t(key) {

    return (
        translations[currentLanguage]?.[key]
        ||
        translations.fr?.[key]
        ||
        key
    );

}


function productName(product) {

    if (currentLanguage === "ar") {

        return product.name_ar;

    }

    if (currentLanguage === "en") {

        return product.name_en;

    }

    return product.name_fr;

}


function productDescription(product) {

    if (currentLanguage === "ar") {

        return product.description_ar;

    }

    if (currentLanguage === "en") {

        return product.description_en;

    }

    return product.description_fr;

}


function categoryName(category) {

    if (currentLanguage === "ar") {

        return category.name_ar;

    }

    if (currentLanguage === "en") {

        return category.name_en;

    }

    return category.name_fr;

}


function showToast(message) {

    const toast = $("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


/* =========================================================
   LOAD SETTINGS
========================================================= */

async function loadSettings() {

    const { data, error } =

        await supabaseClient

            .from("site_settings")

            .select("*")

            .eq("id", 1)

            .single();


    if (error) {

        console.error(error);

        return;

    }


    settings = data;

    currentLanguage =
        settings.default_language || "fr";


    applySettings();

}


/* =========================================================
   APPLY SETTINGS
========================================================= */

function applySettings() {

    if (!settings) return;


    document.title =
        settings.restaurant_name;


    $("brand-name").textContent =
        settings.restaurant_name;


    $("brand-logo").src =
        settings.logo_url || "";


    $("hero-logo").src =
        settings.logo_url || "";


    $("hero-title").textContent =
        translations[currentLanguage]?.hero_title
        ||
        settings.restaurant_name;


    $("hero-description").textContent =
        translations[currentLanguage]?.hero_description
        ||
        "";


    $("restaurant-address").textContent =
        settings.address || "";


    $("phone-link").href =
        settings.phone
            ? `tel:${settings.phone}`
            : "#";


    $("whatsapp-link").href =
        settings.whatsapp
            ? `https://wa.me/${cleanPhone(settings.whatsapp)}`
            : "#";


    $("maps-link").href =
        settings.maps_url || "#";


    document.documentElement.style
        .setProperty(
            "--primary",
            settings.primary_color
        );


    document.documentElement.style
        .setProperty(
            "--secondary",
            settings.secondary_color
        );


    document.documentElement.style
        .setProperty(
            "--accent",
            settings.accent_color
        );


    document.documentElement.style
        .setProperty(
            "--radius",
            `${settings.border_radius}px`
        );


    document.documentElement.style
        .setProperty(
            "--font",
            `${settings.font_family}, Arial, sans-serif`
        );


    $("hero-overlay").style.background =
        `rgba(0,0,0,${
            Number(settings.hero_overlay || 55) / 100
        })`;


    const heroImage =
        $("hero-image");


    heroImage.style.backgroundImage =
        settings.hero_image_url
            ? `url("${settings.hero_image_url}")`
            : "none";


    const heroVideo =
        $("hero-video");


    if (settings.hero_video_url) {

        heroVideo.src =
            settings.hero_video_url;

        heroVideo.style.display =
            "block";

    } else {

        heroVideo.removeAttribute("src");

        heroVideo.style.display =
            "none";

    }


    if (
        settings.theme_mode === "light"
    ) {

        document.body.classList.add(
            "light-theme"
        );

    } else {

        document.body.classList.remove(
            "light-theme"
        );

    }


    $("phone-link").style.display =
        settings.show_phone
            ? "inline-flex"
            : "none";


    $("whatsapp-link").style.display =
        settings.show_whatsapp
            ? "inline-flex"
            : "none";


    $("maps-link").style.display =
        settings.show_maps
            ? "inline-flex"
            : "none";


    renderSocials();

}


/* =========================================================
   LOAD TRANSLATIONS
========================================================= */

async function loadTranslations() {

    const { data, error } =

        await supabaseClient

            .from("translations")

            .select("*");


    if (error) {

        console.error(error);

        return;

    }


    translations = {};


    data.forEach(row => {

        if (!translations[row.language]) {

            translations[row.language] = {};

        }

        translations[row.language][row.key] =
            row.value;

    });


    applyLanguage();

}


/* =========================================================
   APPLY LANGUAGE
========================================================= */

function applyLanguage() {

    document.documentElement.lang =
        currentLanguage;


    document.body.dir =
        currentLanguage === "ar"
            ? "rtl"
            : "ltr";


    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {

            const key =
                element.dataset.i18n;

            element.textContent =
                t(key);

        });


    renderCategories();

    renderProducts();

    renderCart();

    applySettings();

}


/* =========================================================
   CHANGE LANGUAGE
========================================================= */

async function changeLanguage(language) {

    currentLanguage =
        language;

    localStorage.setItem(
        "restaurant_language",
        language
    );


    applyLanguage();

    $("language-menu")
        .classList.add("hidden");

}


/* =========================================================
   LOAD CATEGORIES
========================================================= */

async function loadCategories() {

    const { data, error } =

        await supabaseClient

            .from("categories")

            .select("*")

            .eq("visible", true)

            .order("sort_order", {
                ascending: true
            });


    if (error) {

        console.error(error);

        return;

    }


    categories = data || [];

    renderCategories();

}


/* =========================================================
   RENDER CATEGORIES
========================================================= */

function renderCategories() {

    const container =
        $("category-list");


    container.innerHTML = "";


    const allButton =
        document.createElement("button");


    allButton.textContent =
        currentLanguage === "fr"
            ? "Tout"
            : currentLanguage === "ar"
            ? "الكل"
            : "All";


    allButton.className =
        selectedCategory === "all"
            ? "active"
            : "";


    allButton.onclick = () => {

        selectedCategory = "all";

        renderCategories();

        renderProducts();

    };


    container.appendChild(
        allButton
    );


    categories.forEach(category => {

        const button =
            document.createElement("button");


        button.textContent =
            categoryName(category);


        button.className =
            selectedCategory === category.id
                ? "active"
                : "";


        button.onclick = () => {

            selectedCategory =
                category.id;

            renderCategories();

            renderProducts();

        };


        container.appendChild(button);

    });

}


/* =========================================================
   LOAD PRODUCTS
========================================================= */

async function loadProducts() {

    const { data, error } =

        await supabaseClient

            .from("products")

            .select("*")

            .eq("visible", true)

            .eq("available", true)

            .order("sort_order", {
                ascending: true
            });


    if (error) {

        console.error(error);

        return;

    }


    products = data || [];

    renderProducts();

}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts() {

    const container =
        $("product-grid");


    container.innerHTML = "";


    let visibleProducts =
        products;


    if (selectedCategory !== "all") {

        visibleProducts =
            products.filter(
                product =>
                    product.category_id
                    === selectedCategory
            );

    }


    if (visibleProducts.length === 0) {

        container.innerHTML = `
            <p>
                ${
                    currentLanguage === "fr"
                    ? "Aucun produit disponible."
                    : currentLanguage === "ar"
                    ? "لا توجد منتجات متاحة."
                    : "No products available."
                }
            </p>
        `;

        return;

    }


    visibleProducts.forEach(product => {

        const card =
            document.createElement("article");


        card.className =
            "product-card";


        const image =
            product.image_url
            ||
            "https://placehold.co/800x600?text=Food";


        card.innerHTML = `

            <img
                class="product-image"
                src="${escapeHTML(image)}"
                alt="${escapeHTML(
                    productName(product)
                )}"
                loading="lazy"
            >


            <div class="product-body">

                <h3>
                    ${escapeHTML(
                        productName(product)
                    )}
                </h3>


                <p class="product-description">
                    ${escapeHTML(
                        productDescription(product)
                    )}
                </p>


                <div class="product-bottom">

                    <span class="product-price">
                        ${Number(product.price).toFixed(2)} DH
                    </span>


                    <button
                        class="add-button"
                        data-product-id="${product.id}"
                    >
                        +
                    </button>

                </div>

            </div>

        `;


        card
            .querySelector(".add-button")
            .onclick = () => {

                addToCart(product.id);

            };


        container.appendChild(card);

    });

}


/* =========================================================
   CART
========================================================= */

function addToCart(productId) {

    const product =
        products.find(
            p => p.id === productId
        );


    if (!product) return;


    const existing =
        cart.find(
            item =>
                item.product.id
                === productId
        );


    if (existing) {

        existing.quantity++;

    } else {

        cart.push({

            product,

            quantity: 1

        });

    }


    saveCart();

    renderCart();

    showToast(
        currentLanguage === "fr"
            ? "Ajouté au panier"
            : currentLanguage === "ar"
            ? "تمت الإضافة إلى السلة"
            : "Added to cart"
    );

}


function changeQuantity(
    productId,
    amount
) {

    const item =
        cart.find(
            x =>
                x.product.id
                === productId
        );


    if (!item) return;


    item.quantity += amount;


    if (item.quantity <= 0) {

        cart =
            cart.filter(
                x =>
                    x.product.id
                    !== productId
            );

    }


    saveCart();

    renderCart();

}


function renderCart() {

    const container =
        $("cart-items");


    container.innerHTML = "";


    let total = 0;

    let count = 0;


    cart.forEach(item => {

        const product =
            item.product;


        const lineTotal =
            Number(product.price)
            * item.quantity;


        total += lineTotal;

        count += item.quantity;


        const row =
            document.createElement("div");


        row.className =
            "cart-item";


        row.innerHTML = `

            <div>

                <strong>
                    ${escapeHTML(
                        productName(product)
                    )}
                </strong>

                <div>
                    ${Number(product.price).toFixed(2)} DH
                </div>

            </div>


            <div class="cart-item-controls">

                <button
                    data-minus="${product.id}"
                >
                    −
                </button>

                <span>
                    ${item.quantity}
                </span>

                <button
                    data-plus="${product.id}"
                >
                    +
                </button>

            </div>

        `;


        row.querySelector(
            "[data-minus]"
        ).onclick = () => {

            changeQuantity(
                product.id,
                -1
            );

        };


        row.querySelector(
            "[data-plus]"
        ).onclick = () => {

            changeQuantity(
                product.id,
                1
            );

        };


        container.appendChild(row);

    });


    if (cart.length === 0) {

        container.innerHTML = `
            <p>
                ${t("empty_cart")}
            </p>
        `;

    }


    $("cart-total").textContent =
        `${total.toFixed(2)} DH`;


    $("cart-count").textContent =
        count;

}


function saveCart() {

    localStorage.setItem(
        "restaurant_cart",
        JSON.stringify(
            cart.map(item => ({
                productId:
                    item.product.id,
                quantity:
                    item.quantity
            }))
        )
    );

}


/* =========================================================
   RESTORE CART
========================================================= */

function restoreCart() {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(
                    "restaurant_cart"
                )
            );


        if (!Array.isArray(saved))
            return;


        cart = [];


        saved.forEach(savedItem => {

            const product =
                products.find(
                    p =>
                        p.id
                        === savedItem.productId
                );


            if (product) {

                cart.push({

                    product,

                    quantity:
                        savedItem.quantity

                });

            }

        });


        renderCart();

    } catch {

        cart = [];

    }

}


/* =========================================================
   CHECKOUT
========================================================= */

async function placeOrder(event) {

    event.preventDefault();


    if (cart.length === 0) {

        showToast(
            t("empty_cart")
        );

        return;

    }


    const customerName =
        $("customer-name").value.trim();


    const customerPhone =
        $("customer-phone").value.trim();


    const customerAddress =
        $("customer-address").value.trim();


    const customerNotes =
        $("customer-notes").value.trim();


    const orderType =
        $("order-type").value;


    const paymentMethod =
        $("payment-method").value;


    let subtotal = 0;


    cart.forEach(item => {

        subtotal +=
            Number(item.product.price)
            * item.quantity;

    });


    const deliveryFee =
        orderType === "delivery"
            ? 0
            : 0;


    const total =
        subtotal + deliveryFee;


    const { data: order, error } =

        await supabaseClient

            .from("orders")

            .insert({

                customer_name:
                    customerName,

                customer_phone:
                    customerPhone,

                customer_address:
                    customerAddress,

                customer_notes:
                    customerNotes,

                order_type:
                    orderType,

                payment_method:
                    paymentMethod,

                subtotal:
                    subtotal,

                delivery_fee:
                    deliveryFee,

                total:
                    total

            })

            .select()

            .single();


    if (error) {

        console.error(error);

        showToast(
            "Could not place order."
        );

        return;

    }


    const items =
        cart.map(item => ({

            order_id:
                order.id,

            product_id:
                item.product.id,

            product_name:
                productName(item.product),

            quantity:
                item.quantity,

            unit_price:
                item.product.price,

            total_price:
                Number(item.product.price)
                * item.quantity

        }));


    const {
        error: itemError
    } = await supabaseClient

        .from("order_items")

        .insert(items);


    if (itemError) {

        console.error(itemError);

        showToast(
            "Order was created but items failed."
        );

        return;

    }


    cart = [];

    saveCart();

    renderCart();


    $("checkout-modal")
        .classList.add("hidden");


    $("cart-drawer")
        .classList.remove("open");


    $("cart-overlay")
        .classList.add("hidden");


    $("checkout-form").reset();


    showToast(
        t("order_success")
    );


    sendWhatsAppCopy(
        order,
        items
    );

}


/* =========================================================
   WHATSAPP COPY
========================================================= */

function cleanPhone(phone) {

    return String(phone || "")
        .replace(/[^\d]/g, "");

}


function sendWhatsAppCopy(
    order,
    items
) {

    if (
        !settings?.whatsapp
    ) return;


    let message =
        `🍽️ ${settings.restaurant_name}\n\n`;


    message +=
        `Order: ${order.id}\n`;


    message +=
        `Name: ${order.customer_name}\n`;


    message +=
        `Phone: ${order.customer_phone}\n`;


    message +=
        `Address: ${order.customer_address}\n\n`;


    items.forEach(item => {

        message +=
            `${item.product_name} × ${item.quantity} = ${Number(item.total_price).toFixed(2)} DH\n`;

    });


    message +=
        `\nTOTAL: ${Number(order.total).toFixed(2)} DH`;


    const url =
        `https://wa.me/${cleanPhone(
            settings.whatsapp
        )}?text=${encodeURIComponent(
            message
        )}`;


    /*
        We don't force-open WhatsApp automatically.

        The order is already saved in Supabase.

        This button can be added later if desired.
    */

}


/* =========================================================
   SOCIAL LINKS
========================================================= */

function renderSocials() {

    const container =
        $("social-links");


    container.innerHTML = "";


    if (
        settings.instagram_url
    ) {

        container.innerHTML += `
            <a
                href="${escapeHTML(
                    settings.instagram_url
                )}"
                target="_blank"
            >
                Instagram
            </a>
        `;

    }


    if (
        settings.facebook_url
    ) {

        container.innerHTML += `
            <a
                href="${escapeHTML(
                    settings.facebook_url
                )}"
                target="_blank"
            >
                Facebook
            </a>
        `;

    }


    if (
        settings.tiktok_url
    ) {

        container.innerHTML += `
            <a
                href="${escapeHTML(
                    settings.tiktok_url
                )}"
                target="_blank"
            >
                TikTok
            </a>
        `;

    }

}


/* =========================================================
   AUTH
========================================================= */

async function loginAdmin(event) {

    event.preventDefault();


    const email =
        $("admin-email").value;


    const password =
        $("admin-password").value;


    $("login-error").textContent =
        "";


    const {
        data,
        error
    } =
        await supabaseClient.auth
            .signInWithPassword({

                email,

                password

            });


    if (error) {

        $("login-error").textContent =
            error.message;

        return;

    }


    currentUser =
        data.user;


    await verifyAdmin();


}


async function verifyAdmin() {

    const {
        data,
        error
    } =
        await supabaseClient

            .from("admin_users")

            .select("user_id")

            .eq(
                "user_id",
                currentUser.id
            )
            .maybeSingle();


    if (
        error
        ||
        !data
    ) {

        await supabaseClient.auth
            .signOut();


        $("login-error").textContent =
            "This account is not an administrator.";

        return;

    }


    openAdminPanel();

}


async function logoutAdmin() {

    await supabaseClient.auth
        .signOut();


    currentUser = null;

    closeAdminPanel();

}


/* =========================================================
   ADMIN PANEL
========================================================= */

function openAdminPanel() {

    $("admin-login")
        .classList.add("hidden");


    $("admin-panel")
        .classList.remove("hidden");


    loadAdminData();

}


function closeAdminPanel() {

    $("admin-panel")
        .classList.add("hidden");

}


function openAdminLogin() {

    $("admin-login")
        .classList.remove("hidden");

}


/* =========================================================
   ADMIN DATA
========================================================= */

async function loadAdminData() {

    await Promise.all([

        loadAdminCategories(),

        loadAdminProducts(),

        loadAdminOrders(),

        loadAdminSettings()

    ]);


    updateStats();

}


/* =========================================================
   ADMIN SETTINGS
========================================================= */

async function loadAdminSettings() {

    const {
        data,
        error
    } =
        await supabaseClient

            .from("site_settings")

            .select("*")

            .eq("id", 1)

            .single();


    if (error) {

        console.error(error);

        return;

    }


    settings = data;


    $("setting-name").value =
        settings.restaurant_name || "";


    $("setting-phone").value =
        settings.phone || "";


    $("setting-whatsapp").value =
        settings.whatsapp || "";


    $("setting-email").value =
        settings.email || "";


    $("setting-address").value =
        settings.address || "";


    $("setting-maps").value =
        settings.maps_url || "";


    $("setting-instagram").value =
        settings.instagram_url || "";


    $("setting-facebook").value =
        settings.facebook_url || "";


    $("setting-tiktok").value =
        settings.tiktok_url || "";


    $("setting-hours").value =
        settings.opening_hours || "";


    $("design-primary").value =
        settings.primary_color || "#d62828";


    $("design-secondary").value =
        settings.secondary_color || "#111111";


    $("design-accent").value =
        settings.accent_color || "#fcbf49";


    $("design-radius").value =
        settings.border_radius || 14;


    $("design-overlay").value =
        settings.hero_overlay || 55;


    $("design-font").value =
        settings.font_family || "Inter";


    $("design-image").value =
        settings.hero_image_url || "";


    $("design-video").value =
        settings.hero_video_url || "";


    $("design-logo").value =
        settings.logo_url || "";


    $("design-theme").value =
        settings.theme_mode || "dark";

}


/* =========================================================
   SAVE GENERAL
========================================================= */

async function saveGeneral(event) {

    event.preventDefault();


    const updates = {

        restaurant_name:
            $("setting-name").value.trim(),

        phone:
            $("setting-phone").value.trim(),

        whatsapp:
            $("setting-whatsapp").value.trim(),

        email:
            $("setting-email").value.trim(),

        address:
            $("setting-address").value.trim(),

        maps_url:
            $("setting-maps").value.trim(),

        instagram_url:
            $("setting-instagram").value.trim(),

        facebook_url:
            $("setting-facebook").value.trim(),

        tiktok_url:
            $("setting-tiktok").value.trim(),

        opening_hours:
            $("setting-hours").value.trim(),

        updated_at:
            new Date().toISOString()

    };


    const {
        error
    } =
        await supabaseClient

            .from("site_settings")

            .update(updates)

            .eq("id", 1);


    if (error) {

        showToast(error.message);

        return;

    }


    await loadSettings();

    showToast("Saved!");

}


/* =========================================================
   SAVE DESIGN
========================================================= */

async function saveDesign(event) {

    event.preventDefault();


    const updates = {

        primary_color:
            $("design-primary").value,

        secondary_color:
            $("design-secondary").value,

        accent_color:
            $("design-accent").value,

        border_radius:
            Number(
                $("design-radius").value
            ),

        hero_overlay:
            Number(
                $("design-overlay").value
            ),

        font_family:
            $("design-font").value,

        hero_image_url:
            $("design-image").value.trim(),

        hero_video_url:
            $("design-video").value.trim(),

        logo_url:
            $("design-logo").value.trim(),

        theme_mode:
            $("design-theme").value,

        updated_at:
            new Date().toISOString()

    };


    const {
        error
    } =
        await supabaseClient

            .from("site_settings")

            .update(updates)

            .eq("id", 1);


    if (error) {

        showToast(error.message);

        return;

    }


    await loadSettings();

    showToast("Design saved!");

}


/* =========================================================
   ADMIN CATEGORIES
========================================================= */

async function loadAdminCategories() {

    const {
        data,
        error
    } =
        await supabaseClient

            .from("categories")

            .select("*")

            .order("sort_order");


    if (error) {

        console.error(error);

        return;

    }


    categories = data || [];

    renderAdminCategories();

}


function renderAdminCategories() {

    const container =
        $("admin-categories");


    container.innerHTML = "";


    categories.forEach(category => {

        const div =
            document.createElement("div");


        div.className =
            "admin-category-card";


        div.innerHTML = `

            <strong>
                ${escapeHTML(
                    category.name_fr
                )}
            </strong>

            <span>
                /
                ${escapeHTML(
                    category.name_en
                )}
            </span>

            <div class="admin-actions">

                <button
                    data-edit-category="${category.id}"
                >
                    Edit
                </button>

                <button
                    data-delete-category="${category.id}"
                >
                    Delete
                </button>

            </div>

        `;


        div.querySelector(
            "[data-edit-category]"
        ).onclick = () => {

            openCategoryEditor(
                category
            );

        };


        div.querySelector(
            "[data-delete-category]"
        ).onclick = () => {

            deleteCategory(
                category.id
            );

        };


        container.appendChild(div);

    });

}


/* =========================================================
   ADD CATEGORY
========================================================= */

function openCategoryEditor(
    category = null
) {

    $("category-editor")
        .classList.remove("hidden");


    $("category-id").value =
        category?.id || "";


    $("category-fr").value =
        category?.name_fr || "";


    $("category-ar").value =
        category?.name_ar || "";


    $("category-en").value =
        category?.name_en || "";


    $("category-order").value =
        category?.sort_order || 0;


    $("category-visible").checked =
        category?.visible !== false;

}


async function saveCategory(event) {

    event.preventDefault();


    const id =
        $("category-id").value;


    const category = {

        name_fr:
            $("category-fr").value.trim(),

        name_ar:
            $("category-ar").value.trim(),

        name_en:
            $("category-en").value.trim(),

        sort_order:
            Number(
                $("category-order").value
            ),

        visible:
            $("category-visible").checked

    };


    let error;


    if (id) {

        ({
            error
        } =
            await supabaseClient

                .from("categories")

                .update(category)

                .eq("id", id));

    } else {

        ({
            error
        } =
            await supabaseClient

                .from("categories")

                .insert(category));

    }


    if (error) {

        showToast(error.message);

        return;

    }


    $("category-editor")
        .classList.add("hidden");


    await loadCategories();

    await loadAdminCategories();

    await loadAdminProducts();

    showToast("Category saved!");

}


/* =========================================================
   DELETE CATEGORY
========================================================= */

async function deleteCategory(id) {

    if (
        !confirm(
            "Delete this category?"
        )
    ) return;


    const {
        error
    } =
        await supabaseClient

            .from("categories")

            .delete()

            .eq("id", id);


    if (error) {

        showToast(error.message);

        return;

    }


    await loadCategories();

    await loadAdminCategories();

    showToast("Category deleted.");

}


/* =========================================================
   ADMIN PRODUCTS
========================================================= */

async function loadAdminProducts() {

    const {
        data,
        error
    } =
        await supabaseClient

            .from("products")

            .select("*")

            .order("sort_order");


    if (error) {

        console.error(error);

        return;

    }


    products = data || [];

    renderAdminProducts();

}


function renderAdminProducts() {

    const container =
        $("admin-products");


    container.innerHTML = "";


    products.forEach(product => {

        const div =
            document.createElement("div");


        div.className =
            "admin-product-card";


        div.innerHTML = `

            <img
                src="${
                    escapeHTML(
                        product.image_url
                        ||
                        "https://placehold.co/300x200"
                    )
                }"
                alt=""
            >


            <div>

                <strong>
                    ${escapeHTML(
                        product.name_fr
                    )}
                </strong>

                <div>
                    ${Number(
                        product.price
                    ).toFixed(2)} DH
                </div>

                <small>
                    ${
                        product.available
                            ? "Available"
                            : "Unavailable"
                    }
                    ·
                    ${
                        product.visible
                            ? "Visible"
                            : "Hidden"
                    }
                </small>

            </div>


            <div class="admin-actions">

                <button
                    data-edit-product="${product.id}"
                >
                    Edit
                </button>

                <button
                    data-toggle-product="${product.id}"
                >
                    ${
                        product.visible
                            ? "Hide"
                            : "Show"
                    }
                </button>

                <button
                    data-delete-product="${product.id}"
                >
                    Delete
                </button>

            </div>

        `;


        div.querySelector(
            "[data-edit-product]"
        ).onclick = () => {

            openProductEditor(
                product
            );

        };


        div.querySelector(
            "[data-toggle-product]"
        ).onclick = () => {

            toggleProductVisibility(
                product
            );

        };


        div.querySelector(
            "[data-delete-product]"
        ).onclick = () => {

            deleteProduct(
                product.id
            );

        };


        container.appendChild(div);

    });

}


/* =========================================================
   PRODUCT EDITOR
========================================================= */

function openProductEditor(
    product = null
) {

    $("product-editor")
        .classList.remove("hidden");


    $("product-id").value =
        product?.id || "";


    $("product-fr").value =
        product?.name_fr || "";


    $("product-ar").value =
        product?.name_ar || "";


    $("product-en").value =
        product?.name_en || "";


    $("product-description-fr").value =
        product?.description_fr || "";


    $("product-description-ar").value =
        product?.description_ar || "";


    $("product-description-en").value =
        product?.description_en || "";


    $("product-price").value =
        product?.price || 0;


    $("product-image-url").value =
        product?.image_url || "";


    $("product-visible").checked =
        product?.visible !== false;


    $("product-available").checked =
        product?.available !== false;


    $("product-featured").checked =
        product?.featured === true;


    const select =
        $("product-category");


    select.innerHTML = "";


    categories.forEach(category => {

        const option =
            document.createElement("option");


        option.value =
            category.id;


        option.textContent =
            category.name_fr;


        if (
            product?.category_id
            === category.id
        ) {

            option.selected =
                true;

        }


        select.appendChild(
            option
        );

    });

}


async function saveProduct(event) {

    event.preventDefault();


    const id =
        $("product-id").value;


    let imageUrl =
        $("product-image-url")
            .value.trim();


    const imageFile =
        $("product-image-file")
            .files[0];


    if (imageFile) {

        imageUrl =
            await uploadMedia(
                imageFile,
                "images"
            );

    }


    const product = {

        category_id:
            $("product-category").value
            || null,

        name_fr:
            $("product-fr").value.trim(),

        name_ar:
            $("product-ar").value.trim(),

        name_en:
            $("product-en").value.trim(),

        description_fr:
            $("product-description-fr")
                .value.trim(),

        description_ar:
            $("product-description-ar")
                .value.trim(),

        description_en:
            $("product-description-en")
                .value.trim(),

        price:
            Number(
                $("product-price").value
            ),

        image_url:
            imageUrl,

        visible:
            $("product-visible").checked,

        available:
            $("product-available").checked,

        featured:
            $("product-featured").checked,

        updated_at:
            new Date().toISOString()

    };


    let error;


    if (id) {

        ({
            error
        } =
            await supabaseClient

                .from("products")

                .update(product)

                .eq("id", id));

    } else {

        ({
            error
        } =
            await supabaseClient

                .from("products")

                .insert(product));

    }


    if (error) {

        showToast(error.message);

        return;

    }


    $("product-editor")
        .classList.add("hidden");


    $("product-image-file").value =
        "";


    await loadProducts();

    await loadAdminProducts();

    updateStats();

    showToast("Product saved!");

}


/* =========================================================
   PRODUCT VISIBILITY
========================================================= */

async function toggleProductVisibility(
    product
) {

    const {
        error
    } =
        await supabaseClient

            .from("products")

            .update({

                visible:
                    !product.visible

            })

            .eq(
                "id",
                product.id
            );


    if (error) {

        showToast(error.message);

        return;

    }


    await loadProducts();

    await loadAdminProducts();

}


/* =========================================================
   DELETE PRODUCT
========================================================= */

async function deleteProduct(id) {

    if (
        !confirm(
            "Delete this product?"
        )
    ) return;


    const {
        error
    } =
        await supabaseClient

            .from("products")

            .delete()

            .eq("id", id);


    if (error) {

        showToast(error.message);

        return;

    }


    await loadProducts();

    await loadAdminProducts();

    updateStats();

    showToast("Product deleted.");

}


/* =========================================================
   UPLOAD MEDIA
========================================================= */

async function uploadMedia(
    file,
    folder
) {

    if (!file) return "";


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const fileName =
        `${folder}/${crypto.randomUUID()}.${extension}`;


    const {
        error
    } =
        await supabaseClient

            .storage

            .from(
                "restaurant-media"
            )

            .upload(
                fileName,
                file,
                {
                    upsert: false,

                    contentType:
                        file.type
                }
            );


    if (error) {

        console.error(error);

        showToast(
            "Upload failed: " +
            error.message
        );

        return "";

    }


    const {
        data
    } =
        supabaseClient

            .storage

            .from(
                "restaurant-media"
            )

            .getPublicUrl(
                fileName
            );


    return data.publicUrl;

}


/* =========================================================
   ADMIN ORDERS
========================================================= */

async function loadAdminOrders() {

    const {
        data,
        error
    } =
        await supabaseClient

            .from("orders")

            .select(`

                *,

                order_items (

                    id,

                    product_name,

                    quantity,

                    unit_price,

                    total_price

                )

            `)

            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(error);

        return;

    }


    orders = data || [];

    renderOrders();

}


/* =========================================================
   RENDER ORDERS
========================================================= */

function renderOrders() {

    const container =
        $("orders-list");


    container.innerHTML = "";


    const newOrders =
        orders.filter(
            order =>
                order.status === "new"
        );


    $("admin-order-count")
        .textContent =
        newOrders.length;


    newOrders.forEach(order => {

        if (
            Notification.permission
            === "granted"
        ) {

            /*
                Notification is only sent for
                realtime events below.
            */

        }

    });


    if (orders.length === 0) {

        container.innerHTML =
            "<p>No orders yet.</p>";

        return;

    }


    orders.forEach(order => {

        const card =
            document.createElement("article");


        card.className =
            "order-card";


        const date =
            new Date(
                order.created_at
            ).toLocaleString();


        const items =
            order.order_items
                .map(
                    item =>
                        `${escapeHTML(
                            item.product_name
                        )} × ${item.quantity}`
                )
                .join("<br>");


        card.innerHTML = `

            <div>

                <span class="order-status">
                    ${escapeHTML(
                        order.status
                    )}
                </span>

            </div>


            <h3>
                ${escapeHTML(
                    order.customer_name
                )}
            </h3>


            <p>
                📞
                ${escapeHTML(
                    order.customer_phone
                )}
            </p>


            <p>
                📍
                ${escapeHTML(
                    order.customer_address
                )}
            </p>


            <p>
                🕐
                ${escapeHTML(date)}
            </p>


            <div class="order-items">
                ${items}
            </div>


            <strong>
                ${Number(
                    order.total
                ).toFixed(2)} DH
            </strong>


            <div class="order-actions">

                <button
                    data-status="accepted"
                    data-order="${order.id}"
                >
                    Accept
                </button>

                <button
                    data-status="preparing"
                    data-order="${order.id}"
                >
                    Preparing
                </button>

                <button
                    data-status="ready"
                    data-order="${order.id}"
                >
                    Ready
                </button>

                <button
                    data-status="out_for_delivery"
                    data-order="${order.id}"
                >
                    Out for delivery
                </button>

                <button
                    data-status="completed"
                    data-order="${order.id}"
                >
                    Completed
                </button>

                <button
                    data-status="cancelled"
                    data-order="${order.id}"
                >
                    Cancel
                </button>

            </div>

        `;


        card
            .querySelectorAll(
                "[data-status]"
            )
            .forEach(button => {

                button.onclick = () => {

                    updateOrderStatus(

                        button.dataset.order,

                        button.dataset.status

                    );

                };

            });


        container.appendChild(card);

    });

}


/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

async function updateOrderStatus(
    orderId,
    status
) {

    const {
        error
    } =
        await supabaseClient

            .from("orders")

            .update({

                status,

                updated_at:
                    new Date().toISOString()

            })

            .eq(
                "id",
                orderId
            );


    if (error) {

        showToast(error.message);

        return;

    }


    await loadAdminOrders();

    updateStats();

}


/* =========================================================
   REALTIME ORDERS
========================================================= */

function subscribeToOrders() {

    supabaseClient

        .channel(
            "restaurant-orders"
        )

        .on(

            "postgres_changes",

            {

                event: "INSERT",

                schema: "public",

                table: "orders"

            },

            payload => {

                handleNewOrderNotification();

                loadAdminOrders();

                updateStats();

            }

        )

        .subscribe();

}


async function handleNewOrderNotification() {

    showToast(
        "🔔 New order!"
    );


    try {

        if (
            "Notification"
            in window
        ) {

            if (
                Notification.permission
                === "default"
            ) {

                await Notification.requestPermission();

            }


            if (
                Notification.permission
                === "granted"
            ) {

                new Notification(
                    "New restaurant order",
                    {
                        body:
                            "A new order has arrived."
                    }
                );

            }

        }

    } catch (error) {

        console.log(error);

    }


    playNotificationSound();

}


function playNotificationSound() {

    try {

        const audioContext =
            new (
                window.AudioContext
                ||
                window.webkitAudioContext
            )();


        const oscillator =
            audioContext.createOscillator();


        const gain =
            audioContext.createGain();


        oscillator.connect(
            gain
        );


        gain.connect(
            audioContext.destination
        );


        oscillator.frequency.value =
            880;


        gain.gain.value =
            0.1;


        oscillator.start();


        setTimeout(() => {

            oscillator.stop();

        }, 300);

    } catch {

        // Browser may block sound.
    }

}


/* =========================================================
   STATS
========================================================= */

function updateStats() {

    $("stat-products")
        .textContent =
        products.length;


    $("stat-categories")
        .textContent =
        categories.length;


    $("stat-orders")
        .textContent =
        orders.filter(
            order =>
                order.status === "new"
        ).length;

}


/* =========================================================
   ADMIN TABS
========================================================= */

function setupAdminTabs() {

    document
        .querySelectorAll(".admin-tab")
        .forEach(button => {

            button.onclick = () => {

                const tab =
                    button.dataset.tab;


                document
                    .querySelectorAll(
                        ".admin-tab"
                    )
                    .forEach(
                        b =>
                            b.classList.remove(
                                "active"
                            )
                    );


                document
                    .querySelectorAll(
                        ".admin-tab-content"
                    )
                    .forEach(
                        content =>
                            content.classList.remove(
                                "active"
                            )
                    );


                button.classList.add(
                    "active"
                );


                document
                    .querySelector(
                        `[data-content="${tab}"]`
                    )
                    .classList.add(
                        "active"
                    );

            };

        });

}


/* =========================================================
   UI EVENTS
========================================================= */

function setupEvents() {

    /* Language */

    $("language-button").onclick =
        () => {

            $("language-menu")
                .classList.toggle(
                    "hidden"
                );

        };


    document
        .querySelectorAll(
            "[data-language]"
        )
        .forEach(button => {

            button.onclick =
                () => {

                    changeLanguage(
                        button.dataset.language
                    );

                };

        });


    /* Mobile menu */

    $("mobile-menu-button")
        .onclick =
        () => {

            $("mobile-nav")
                .classList.toggle(
                    "hidden"
                );

        };


    /* Cart */

    $("open-cart-button")
        .onclick =
        () => {

            $("cart-drawer")
                .classList.add(
                    "open"
                );

            $("cart-overlay")
                .classList.remove(
                    "hidden"
                );

        };


    function closeCart() {

        $("cart-drawer")
            .classList.remove(
                "open"
            );

        $("cart-overlay")
            .classList.add(
                "hidden"
            );

    }


    $("close-cart")
        .onclick =
        closeCart;


    $("cart-overlay")
        .onclick =
        closeCart;


    /* Checkout */

    $("checkout-button")
        .onclick =
        () => {

            if (
                cart.length === 0
            ) {

                showToast(
                    t("empty_cart")
                );

                return;

            }

            $("checkout-modal")
                .classList.remove(
                    "hidden"
                );

        };


    $("close-checkout")
        .onclick =
        () => {

            $("checkout-modal")
                .classList.add(
                    "hidden"
                );

        };


    $("checkout-form")
        .addEventListener(
            "submit",
            placeOrder
        );


    /* Admin */

    $("login-form")
        .addEventListener(
            "submit",
            loginAdmin
        );


    $("logout-button")
        .onclick =
        logoutAdmin;


    $("admin-login-close")
        .onclick =
        () => {

            window.location.hash =
                "";

            $("admin-login")
                .classList.add(
                    "hidden"
                );

        };


    $("view-site-button")
        .onclick =
        () => {

            window.location.hash =
                "";

            closeAdminPanel();

        };


    /* General */

    $("general-form")
        .addEventListener(
            "submit",
            saveGeneral
        );


    /* Design */

    $("design-form")
        .addEventListener(
            "submit",
            saveDesign
        );


    /* Category */

    $("add-category-button")
        .onclick =
        () => {

            openCategoryEditor();

        };


    $("category-form")
        .addEventListener(
            "submit",
            saveCategory
        );


    $("close-category-editor")
        .onclick =
        () => {

            $("category-editor")
                .classList.add(
                    "hidden"
                );

        };


    /* Product */

    $("add-product-button")
        .onclick =
        () => {

            openProductEditor();

        };


    $("product-form")
        .addEventListener(
            "submit",
            saveProduct
        );


    $("close-product-editor")
        .onclick =
        () => {

            $("product-editor")
                .classList.add(
                    "hidden"
                );

        };


    /* Orders */

    $("refresh-orders")
        .onclick =
        loadAdminOrders;

}


/* =========================================================
   ADMIN HASH
========================================================= */

function checkAdminHash() {

    if (
        window.location.hash
        === "#admin"
    ) {

        if (currentUser) {

            openAdminPanel();

        } else {

            openAdminLogin();

        }

    } else {

        $("admin-login")
            .classList.add(
                "hidden"
            );

        $("admin-panel")
            .classList.add(
                "hidden"
            );

    }

}


/* =========================================================
   AUTH STATE
========================================================= */

async function checkSession() {

    const {
        data
    } =
        await supabaseClient.auth
            .getSession();


    if (
        data?.session?.user
    ) {

        currentUser =
            data.session.user;

    }

}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initialize() {

    setupEvents();

    setupAdminTabs();


    await checkSession();


    const savedLanguage =
        localStorage.getItem(
            "restaurant_language"
        );


    if (savedLanguage) {

        currentLanguage =
            savedLanguage;

    }


    await loadTranslations();

    await loadSettings();

    await loadCategories();

    await loadProducts();


    restoreCart();


    subscribeToOrders();


    checkAdminHash();


    window.addEventListener(
        "hashchange",
        checkAdminHash
    );


    supabaseClient.auth
        .onAuthStateChange(
            async (
                event,
                session
            ) => {

                currentUser =
                    session?.user
                    || null;


                checkAdminHash();

            }
        );

}


initialize();
