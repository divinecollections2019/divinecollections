// ----------------- GLOBAL VARIABLES -----------------
let allProducts = []; // moved here to allow search & category filtering

// ----------------- FETCH AND DISPLAY PRODUCTS -----------------
fetch("js/data.json")
  .then((response) => response.json())
  .then((data) => {
    Object.keys(data).forEach((category) => {
      const subcategories = data[category];
      Object.keys(subcategories).forEach((subcategory) => {
        allProducts = allProducts.concat(subcategories[subcategory]);
      });
    });

    displayProducts(allProducts);
  })
  .catch((error) => console.error("Error loading products:", error));

function displayProducts(products) {
  const container = document.getElementById("products-container");
  if (!container) return;
  container.innerHTML = "";

  products.forEach((product, index) => {
    const defaultImage = product.variants[0].image;

    const card = document.createElement("div");
    card.classList.add("product-card");

    const productId =
      product.id || `${product.category}-${product.subcategory}-${index}`;

    // Build size options for shoes & clothes
    let sizeDropdown = "";
    if (
      product.sizes &&
      (product.category === "shoes" || product.category === "clothes")
    ) {
      const sizeOptions = product.sizes
        .map((size) => `<option value="${size}">${size}</option>`)
        .join("");
      sizeDropdown = `
        <label class="size-label">
          Size:
          <select class="size-select">${sizeOptions}</select>
        </label>
      `;
    }

    card.innerHTML = `
      <div class="variant-slider">
        <img src="${defaultImage}" alt="${product.name}" class="product-img" />
        <div class="variant-controls">
          <button type="button" class="variant-btn prev">&#10094;</button>
          <button type="button" class="variant-btn next">&#10095;</button>
        </div>
      </div>
      <h3 class="product-name">${product.name}</h3>
      <p class="product-price">₦${product.price}</p>
      ${sizeDropdown}
      <button type="button" class="add-to-cart" 
              data-id="${productId}" 
              data-name="${product.name}" 
              data-price="${product.price}" 
              data-img="${defaultImage}">Add to Cart</button>
    `;

    container.appendChild(card);

    // === Variant slider logic ===
    const img = card.querySelector(".product-img");
    const prevBtn = card.querySelector(".variant-btn.prev");
    const nextBtn = card.querySelector(".variant-btn.next");
    const addToCartBtn = card.querySelector(".add-to-cart");

    let currentVariant = 0;

    function updateVariant() {
      const variant = product.variants[currentVariant];
      img.src = variant.image;
      addToCartBtn.dataset.color = variant.color;
      prevBtn.disabled = currentVariant === 0;
      nextBtn.disabled = currentVariant === product.variants.length - 1;
    }

    prevBtn.addEventListener("click", () => {
      if (currentVariant > 0) {
        currentVariant--;
        updateVariant();
      }
    });

    nextBtn.addEventListener("click", () => {
      if (currentVariant < product.variants.length - 1) {
        currentVariant++;
        updateVariant();
      }
    });

    updateVariant();
  });
}

// ----------------- SEARCH FUNCTIONALITY -----------------
const searchInput = document.querySelector(".search-bar");
searchInput?.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    displayProducts(allProducts);
    return;
  }

  const filtered = allProducts.filter((product) => {
    if (query === "bags") return product.category === "bags";
    if (query === "shoes") return product.category === "shoes";
    if (query === "clothes") return product.category === "clothes";
    return product.name.toLowerCase().includes(query);
  });

  displayProducts(filtered);
});

// ----------------- SIDEBAR CATEGORY FILTER -----------------
document.querySelectorAll(".sidebar-icon a").forEach((link) => {
  link.addEventListener("click", (e) => {
    const categoryClass = link.className;

    if (categoryClass === "home") {
      if (searchInput) searchInput.value = ""; // 🔑 clear search
      displayProducts(allProducts);
    } else if (categoryClass === "bags") {
      displayProducts(allProducts.filter((p) => p.category === "bags"));
    } else if (categoryClass === "shoes") {
      displayProducts(allProducts.filter((p) => p.category === "shoes"));
    } else if (categoryClass === "clothes") {
      displayProducts(allProducts.filter((p) => p.category === "clothes"));
    }
  });
});

// ----------------- SIDEBAR & ARROW TOGGLE -----------------
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sidebar");
  const arrow = document.querySelector(".sidebar-arrow i");
  const links = document.querySelectorAll(".sidebar-icon a");

  if (arrow) {
    arrow.addEventListener("click", () => {
      sidebar.classList.toggle("show-names");
      if (sidebar.classList.contains("show-names")) {
        arrow.classList.remove("ph-caret-double-left");
        arrow.classList.add("ph-caret-double-right");
      } else {
        arrow.classList.remove("ph-caret-double-right");
        arrow.classList.add("ph-caret-double-left");
      }
    });
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href && href !== "#") return;
      e.preventDefault();
      links.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });
});

// ----------------- THEME TOGGLE -----------------
document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.querySelector(".theme-toggle");
  const themeIcon = themeToggle?.querySelector("i");
  const themeText = themeToggle?.querySelector(".sidebar-icon-name");

  themeToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    document.body.classList.toggle("darkmode");

    if (document.body.classList.contains("darkmode")) {
      themeIcon.className = "ph ph-sun";
      themeText.textContent = "Switch to lightmode";
    } else {
      themeIcon.className = "ph ph-moon";
      themeText.textContent = "Switch to darkmode";
    }
  });
});

// ----------------- CART LOGIC -----------------
const cartList = document.querySelector(".list-of-product");
const cartBadge = document.querySelector(".cart-badge");
const totalPriceEl = document.querySelector(".total-price");
const checkoutBtn = document.querySelector(".btn-checkout");
const cartToggleBtn = document.querySelector(".btn-toggle-cart-list");
const cartCloseBtn = document.querySelector(".icon-cart-close");

let cartItems = JSON.parse(localStorage.getItem("cartItems")) || [];

// Render cart on page load
updateCartBadge();
renderCart();

// Add to cart
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("add-to-cart")) {
    const card = e.target.closest(".product-card");
    const id = e.target.dataset.id;
    const name = e.target.dataset.name;
    const price = parseFloat(e.target.dataset.price);
    const img = card.querySelector(".product-img").src;
    const color = e.target.dataset.color || "Default";
    const sizeSelect = card.querySelector(".size-select");
    const size = sizeSelect ? sizeSelect.value : null;

    const existing = cartItems.find(
      (item) =>
        item.id === id &&
        item.color === color &&
        (size ? item.size === size : true)
    );

    if (existing) {
      alert("This option is already in your cart. Increase quantity in cart.");
      return;
    }

    cartItems.push({ id, name, price, img, color, size, quantity: 1 });
    renderCart();
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }
});

// Render cart
function renderCart() {
  if (!cartList) return;
  cartList.innerHTML = "";

  cartItems.forEach((item, index) => {
    const div = document.createElement("li");
    div.classList.add("cart-item");
    div.dataset.id = item.id;

    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <img src="${
          item.img
        }" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">
        <div>
          <p style="font-weight:600; margin:0;">${item.name}</p>
          <p style="font-size:0.85rem; margin:0; color:#555;">
            ${item.color}${item.size ? " - Size " + item.size : ""} 
          </p>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <button type="button" class="decrease" data-index="${index}" style="width:22px; height:22px; border:none; border-radius:4px; cursor:pointer;">–</button>
        <span>${item.quantity}</span>
        <button type="button" class="increase" data-index="${index}" style="width:22px; height:22px; border:none; border-radius:4px; cursor:pointer;">+</button>
        <span style="font-weight:600;">₦${(item.price * item.quantity).toFixed(
          2
        )}</span>
        <button type="button" class="remove-item" data-index="${index}" style="cursor:pointer; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px;">×</button>
      </div>
    `;

    cartList.appendChild(div);
  });

  updateCartBadge();
  updateTotal();
}

// Cart item controls
cartList?.addEventListener("click", (e) => {
  const idx = parseInt(e.target.dataset.index);
  if (e.target.classList.contains("increase")) cartItems[idx].quantity += 1;
  else if (e.target.classList.contains("decrease")) {
    if (cartItems[idx].quantity > 1) cartItems[idx].quantity -= 1;
    else cartItems.splice(idx, 1);
  } else if (e.target.classList.contains("remove-item"))
    cartItems.splice(idx, 1);
  renderCart();
  localStorage.setItem("cartItems", JSON.stringify(cartItems));
});

// Update cart badge & total
function updateCartBadge() {
  if (!cartBadge) return;
  const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  cartBadge.textContent = totalQty;
}

function updateTotal() {
  if (!totalPriceEl) return;
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  let discount = 0;
  if (totalQty >= 6) {
    discount = subtotal * 0.15; // 15% discount
  }

  const total = subtotal - discount;

  totalPriceEl.textContent =
    discount > 0
      ? `₦${total.toFixed(2)} (15% off applied)`
      : `₦${total.toFixed(2)}`;

  if (checkoutBtn) checkoutBtn.disabled = cartItems.length === 0;
}

// Toggle cart visibility
cartToggleBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelector(".cart-product-list").classList.toggle("open");
});

// Clear cart button
document.querySelector(".btn-clear-cart")?.addEventListener("click", () => {
  cartItems = [];
  renderCart();
  localStorage.setItem("cartItems", JSON.stringify(cartItems));
});

// Close cart
cartCloseBtn?.addEventListener("click", () => {
  document.querySelector(".cart-product-list").classList.remove("open");
});

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// ----------------- CHECKOUT BUTTON -----------------
checkoutBtn?.addEventListener("click", (e) => {
  e.preventDefault();

  const nameInput = document.querySelector("#cart-name");
  const phoneInput = document.querySelector("#cart-phone");
  const addressInput = document.querySelector("#cart-address");
  const stateSelect = document.querySelector("#cart-state");

  const missingFields = [];
  if (!nameInput?.value.trim()) missingFields.push("Name");
  if (!phoneInput?.value.trim()) missingFields.push("Phone Number");
  if (!addressInput?.value.trim()) missingFields.push("Address");
  if (!stateSelect?.value.trim()) missingFields.push("State");

  if (missingFields.length > 0) {
    alert(
      `Please complete the following fields before checkout: ${missingFields.join(
        ", "
      )}`
    );
    return;
  }

  const checkoutData = {
    orderId: Math.floor(100000 + Math.random() * 900000),
    user: {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      address: addressInput.value.trim(),
      state: stateSelect.value.trim().toLowerCase(),
    },
    items: cartItems,
  };

  localStorage.setItem("checkoutData", JSON.stringify(checkoutData));
  localStorage.setItem("cartItems", JSON.stringify(cartItems));
  window.location.href = "checkout.html";
});

// ----------------- CHECKOUT PAGE RENDER -----------------
document.addEventListener("DOMContentLoaded", () => {
  if (!window.location.pathname.includes("checkout.html")) return;

  const checkoutData = JSON.parse(localStorage.getItem("checkoutData")) || {};
  const cartItems = checkoutData.items || [];
  const tbody = document.getElementById("checkoutBody");
  if (!tbody) return;

  const orderId =
    checkoutData.orderId || Math.floor(100000 + Math.random() * 900000);
  document.getElementById("orderId").textContent = orderId;

  // Customer info
  tbody.innerHTML = `
    <tr><td>Your Order ID:</td><td>${orderId}</td></tr>
    <tr><td>Your Name:</td><td>${checkoutData.user?.name || ""}</td></tr>
    <tr><td>Your Phone Number:</td><td>${
      checkoutData.user?.phone || ""
    }</td></tr>
    <tr><td>Your Address:</td><td>${checkoutData.user?.address || ""}</td></tr>
    <tr><td>Your State:</td><td>${checkoutData.user?.state || ""}</td></tr>
  `;

  // Cart items
  let subtotal = 0;
  let totalQty = 0;
  cartItems.forEach((item) => {
    subtotal += item.price * item.quantity;
    totalQty += item.quantity;
    let desc = item.color;
    if (item.size) desc += ` - Size ${item.size}`;
    tbody.innerHTML += `
      <tr>
        <td>${item.name} (${desc})</td>
        <td>₦${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `;
  });

  // Apply discount if eligible
  let discount = 0;
  if (totalQty >= 6) {
    discount = subtotal * 0.15;
    tbody.innerHTML += `
      <tr><td>15% Discount:</td><td>-₦${discount.toLocaleString()}</td></tr>
    `;
  }

  // Delivery fee
  let deliveryFee = 3500;
  const state = checkoutData.user?.state || "";
  const lagos = ["lagos"];
  const southwest = ["ondo", "osun", "ogun", "oyo", "ekiti", "kwara"];
  const north = [
    "abuja",
    "borno",
    "niger",
    "plateau",
    "kaduna",
    "kano",
    "jigawa",
    "katsina",
    "kebbi",
    "sokoto",
    "zamfara",
    "adamawa",
    "bauchi",
    "gombe",
    "taraba",
    "yobe",
    "benue",
    "nasarawa",
  ];

  // ✅ Always check free delivery first using checkoutData.items
  if ((checkoutData.items?.length || 0) >= 10) {
    deliveryFee = 0;
  } else if (lagos.includes(state)) {
    deliveryFee = 2500;
  } else if (southwest.includes(state)) {
    deliveryFee = 3000;
  } else if (north.includes(state)) {
    deliveryFee = 4000;
  }

  const total = subtotal - discount + deliveryFee;

  tbody.innerHTML += `
    <tr><td>Delivery Fee:</td><td>₦${deliveryFee.toLocaleString()}</td></tr>
    <tr class="total-row"><td>Total:</td><td>₦${total.toLocaleString()}</td></tr>
  `;

  // WhatsApp order button beneath wrapper
  const wrapper = document.querySelector(".wrapper");
  if (!wrapper) return;

  const whatsappContainer = document.createElement("div");
  whatsappContainer.style.marginTop = "2rem";
  whatsappContainer.style.textAlign = "center";

  const whatsappBtn = document.createElement("a");
  whatsappBtn.className = "whatsapp-order-btn";
  whatsappBtn.style.display = "inline-flex";
  whatsappBtn.style.alignItems = "center";
  whatsappBtn.style.backgroundColor = "#25D366";
  whatsappBtn.style.color = "#fff";
  whatsappBtn.style.padding = "0.8rem 1.5rem";
  whatsappBtn.style.borderRadius = "8px";
  whatsappBtn.style.fontWeight = "600";
  whatsappBtn.style.textDecoration = "none";
  whatsappBtn.style.fontSize = "1rem";
  whatsappBtn.style.transition = "background 0.3s ease";
  whatsappBtn.innerHTML = `<i class="ph ph-whatsapp" style="margin-right:0.5rem;"></i> CLICK TO PLACE ORDER`;
  whatsappBtn.target = "_blank"; // ✅ force open in new tab
  whatsappBtn.rel = "noopener noreferrer"; // ✅ safe new tab

  const amount = total;
  const phone = "2348164473941";

  // ✅ Safely pull address & state
  const userName = checkoutData?.user?.name || "";
  const userAddress = checkoutData?.user?.address || "";
  const userState = checkoutData?.user?.state || "";

  const message = `Hi, Divine Collections, my order ID is *${orderId}*.
My name is *${userName}*.
My address is *${userAddress}, ${userState}*.
My total is ₦${amount.toLocaleString()} (including delivery).`;

  whatsappBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(
    message
  )}`;

  whatsappContainer.appendChild(whatsappBtn);
  wrapper.insertAdjacentElement("afterend", whatsappContainer);
});
