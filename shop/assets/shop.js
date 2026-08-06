/* =========================================================
   FitnessForge Store — shared logic
   Catalog · localStorage cart · nav/menu · reveal · toast
   Buy flow: Add to Cart -> Upsell -> Downsell -> Cart -> Checkout -> Thank You
   ========================================================= */
(function(global){
  "use strict";

  /* ---------------- Catalog ---------------- */
  // NOTE: prices for Cookbook & Masterclass are placeholders — tell us the real ones.
  var CATALOG = {
    blueprint: {
      id:"blueprint", name:"Physique Builder Blueprint", price:39.99, compare:99,
      cover:"blueprint", tag:"Complete System", badge:"Best Value", badgeClass:"best",
      rating:4.9, reviews:238,
      short:"The complete training + nutrition system that takes you from guessing to a clear, week-by-week plan.",
      bullets:[
        "12-week structured training program",
        "Full nutrition & macro system",
        "Progress tracking templates",
        "Exercise technique video library",
        "Six connected resources, one purchase",
        "14-day risk-free guarantee"
      ]
    },
    masterclass: {
      id:"masterclass", name:"Progressive Overload Masterclass", price:29.99, compare:59,
      cover:"masterclass", tag:"Video Masterclass", badge:"New",
      rating:4.9, reviews:64,
      short:"Master the single most important principle for building muscle — how to progress correctly, every week.",
      bullets:[
        "Step-by-step video lessons",
        "How to add weight, reps & sets safely",
        "Break through training plateaus",
        "Track progression the right way",
        "Lifetime access, watch anywhere"
      ]
    },
    cookbook: {
      id:"cookbook", name:"The FitnessForge Cookbook", price:19.99, compare:34.99,
      cover:"cookbook", tag:"Recipe Collection", badge:"Popular",
      rating:4.8, reviews:121,
      short:"High-protein meals that actually taste good — simple recipes built to support muscle growth and fat loss.",
      bullets:[
        "60+ high-protein recipes",
        "Breakfasts, mains, snacks & desserts",
        "Full macros listed for every meal",
        "Simple ingredients, quick to cook",
        "Flexible — no foods off-limits"
      ]
    },
    nutrition: {
      id:"nutrition", name:"Nutrition Fundamentals Guide", price:9.99, compare:24.99,
      cover:"nutrition", tag:"Add-On Guide", badge:"Add-On",
      rating:4.9, reviews:96,
      short:"Make your results happen faster. The simple nutrition system with no calorie-counting spreadsheets or confusing tracking.",
      bullets:[
        "Exactly what to eat & how much",
        "No complicated tracking",
        "Build meals that fit your goals",
        "Perfect companion to the Blueprint"
      ]
    },
    mealplan: {
      id:"mealplan", name:"7-Day Kickstart Meal Plan", price:4.99, compare:14.99,
      cover:"mealplan", tag:"Quick Start", badge:"Starter",
      rating:4.8, reviews:73,
      short:"Not ready for the full guide? Start eating right today. A done-for-you 7-day plan — no planning, no macros, just follow it.",
      bullets:[
        "A full 7 days planned for you",
        "No planning or thinking required",
        "Simple, tasty, everyday foods",
        "The easiest way to start"
      ]
    }
  };

  var STORE_ITEMS = ["blueprint","masterclass","cookbook"]; // shown on shop page
  var CART_KEY = "ff_cart";

  /* ---------------- Cart (localStorage) ---------------- */
  function readCart(){
    try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch(e){ return []; }
  }
  function writeCart(ids){ localStorage.setItem(CART_KEY, JSON.stringify(ids)); updateBadge(); }
  function inCart(id){ return readCart().indexOf(id) !== -1; }
  function addItem(id){
    var c = readCart();
    if(c.indexOf(id) === -1){ c.push(id); writeCart(c); }
    return c;
  }
  function removeItem(id){
    writeCart(readCart().filter(function(x){ return x !== id; }));
  }
  function clearCart(){ localStorage.removeItem(CART_KEY); updateBadge(); }
  function cartProducts(){ return readCart().map(function(id){ return CATALOG[id]; }).filter(Boolean); }
  function cartTotal(){ return cartProducts().reduce(function(s,p){ return s + p.price; }, 0); }
  function money(n){ return "£" + n.toFixed(2); }

  function updateBadge(){
    var count = readCart().length;
    document.querySelectorAll(".cart-count").forEach(function(el){
      el.textContent = count;
      el.classList.toggle("show", count > 0);
    });
  }
  function bumpCart(){
    document.querySelectorAll(".cart-btn").forEach(function(b){
      b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    });
  }

  /* ---------------- Toast ---------------- */
  var toastTimer;
  function toast(msg){
    var t = document.getElementById("toast");
    if(!t){
      t = document.createElement("div"); t.id = "toast"; t.className = "toast";
      document.body.appendChild(t);
    }
    t.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span></span>';
    t.querySelector("span").textContent = msg;
    requestAnimationFrame(function(){ t.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove("show"); }, 2400);
  }

  /* ---------------- Buy flow ----------------
     Add a product to the cart, then route into the
     upsell -> downsell -> cart sequence (once per journey). */
  function buy(id){
    addItem(id); bumpCart();
    // If they don't yet have the nutrition add-on, offer the upsell.
    if(!inCart("nutrition")){
      sessionStorage.setItem("ff_from", id);
      global.location.href = "upsell.html";
    } else {
      global.location.href = "cart.html";
    }
  }

  /* ---------------- Nav / menu / reveal ---------------- */
  function initChrome(){
    updateBadge();

    var burger = document.getElementById("burger"),
        menu = document.getElementById("mobileMenu"),
        backdrop = document.getElementById("backdrop");
    if(burger && menu && backdrop){
      var setMenu = function(open){
        burger.classList.toggle("open", open);
        menu.classList.toggle("open", open);
        backdrop.classList.toggle("open", open);
        burger.setAttribute("aria-expanded", open);
        document.body.style.overflow = open ? "hidden" : "";
      };
      burger.addEventListener("click", function(){ setMenu(!menu.classList.contains("open")); });
      backdrop.addEventListener("click", function(){ setMenu(false); });
      menu.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", function(){ setMenu(false); }); });
    }

    // seamless marquees
    ["trustTrack","reviewRow"].forEach(function(idv){
      var el = document.getElementById(idv);
      if(el) el.innerHTML += el.innerHTML;
    });

    // reveal on scroll
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var reveals = document.querySelectorAll(".reveal");
    if(reduce || !("IntersectionObserver" in window)){
      reveals.forEach(function(el){ el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){
            var sibs = Array.prototype.slice.call(e.target.parentNode.children).filter(function(c){return c.classList.contains("reveal");});
            e.target.style.transitionDelay = (Math.max(0, sibs.indexOf(e.target)) * 0.07) + "s";
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      }, {threshold:0.12, rootMargin:"0px 0px -40px 0px"});
      reveals.forEach(function(el){ io.observe(el); });
    }

    var yr = document.getElementById("year"); if(yr) yr.textContent = new Date().getFullYear();

    // delegated add-to-cart so dynamically rendered cards work too
    document.addEventListener("click", function(e){
      var btn = e.target.closest ? e.target.closest("[data-buy]") : null;
      if(btn){ e.preventDefault(); buy(btn.getAttribute("data-buy")); }
    });
  }

  document.addEventListener("DOMContentLoaded", initChrome);

  /* ---------------- Render helpers ---------------- */
  var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  function coverHTML(p){
    return '<div class="cover '+p.cover+'">'
      + '<span class="c-tag">'+esc(p.tag)+'</span>'
      + '<h3>'+esc(p.name)+'</h3>'
      + '<div class="c-div"></div>'
      + '<p class="c-sub">'+esc(p.short.split(".")[0])+'.</p>'
      + '<div class="c-foot"><span class="logo"><span class="logo-mark">FF</span>FitnessForge</span></div>'
      + '</div>';
  }

  function cardHTML(p){
    var badge = p.badge ? '<span class="pc-badge '+(p.badgeClass||"")+'">'+esc(p.badge)+'</span>' : "";
    var was = p.compare ? '<span class="price-was">'+money(p.compare)+'</span>' : "";
    return '<article class="product-card reveal">'
      + '<a class="pc-cover" href="product.html?id='+p.id+'">'+coverHTML(p)+'</a>'
      + '<div class="pc-body">'
      + badge
      + '<h3>'+esc(p.name)+'</h3>'
      + '<p class="pc-desc">'+esc(p.short)+'</p>'
      + '<div class="price-row"><span class="price-now">'+money(p.price)+'</span>'+was+'</div>'
      + '<div class="pc-actions">'
      + '<a class="btn btn-ghost" href="product.html?id='+p.id+'">View</a>'
      + '<button class="btn btn-primary" data-buy="'+p.id+'">Add to Cart</button>'
      + '</div></div></article>';
  }

  function renderGrid(el, ids){
    if(!el) return;
    el.innerHTML = ids.map(function(id){ return cardHTML(CATALOG[id]); }).join("");
  }

  /* ---------------- Public API ---------------- */
  global.FF = {
    coverHTML:coverHTML, cardHTML:cardHTML, renderGrid:renderGrid, CHECK:CHECK, esc:esc,
    CATALOG:CATALOG, STORE_ITEMS:STORE_ITEMS,
    readCart:readCart, cartProducts:cartProducts, cartTotal:cartTotal,
    addItem:addItem, removeItem:removeItem, clearCart:clearCart, inCart:inCart,
    buy:buy, money:money, toast:toast, updateBadge:updateBadge, bumpCart:bumpCart
  };
})(window);
