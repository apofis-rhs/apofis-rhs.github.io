(function () {
    "use strict";

    var root = document.documentElement;

    /* ---------- Tema claro / oscuro ---------- */
    var themeButtons = document.querySelectorAll(".theme-toggle");
    var themeLabel = document.querySelector(".theme-label");
    var metaTheme = document.querySelector('meta[name="theme-color"]');

    function applyTheme(theme) {
        root.setAttribute("data-theme", theme);
        try { localStorage.setItem("theme", theme); } catch (e) { }
        if (themeLabel) themeLabel.textContent = theme === "dark" ? "Modo claro" : "Modo oscuro";
        if (metaTheme) metaTheme.setAttribute("content", theme === "dark" ? "#090B22" : "#E6E0F7");
    }

    applyTheme(root.getAttribute("data-theme") || "light");

    themeButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
        });
    });

    /* ---------- Menú lateral en móvil ---------- */
    var menuBtn = document.getElementById("menuBtn");
    var sidebar = document.getElementById("sidebar");
    var scrim = document.getElementById("scrim");

    function setMenu(open) {
        sidebar.classList.toggle("open", open);
        document.body.classList.toggle("menu-open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    }

    menuBtn.addEventListener("click", function () {
        setMenu(!sidebar.classList.contains("open"));
    });
    scrim.addEventListener("click", function () { setMenu(false); });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") setMenu(false);
    });
    sidebar.querySelectorAll(".nav-link").forEach(function (link) {
        link.addEventListener("click", function () { setMenu(false); });
    });

    /* ---------- Enlace activo según la sección visible ---------- */
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
    var targets = links
        .map(function (l) { return document.querySelector(l.getAttribute("href")); })
        .filter(Boolean);

    function setActive(id) {
        links.forEach(function (l) {
            l.classList.toggle("active", l.getAttribute("href") === "#" + id);
        });
    }

    if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) setActive(entry.target.id);
            });
        }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
        targets.forEach(function (t) { observer.observe(t); });
    }
    setActive("perfil");

    /* ---------- Rayos del sol art déco ---------- */
    var rays = document.getElementById("rays");
    if (rays) {
        var NS = "http://www.w3.org/2000/svg";
        var total = 36;
        for (var i = 0; i < total; i++) {
            var angle = (i / total) * Math.PI * 2;
            var r1 = 62;
            var r2 = i % 2 === 0 ? 96 : 80;
            var line = document.createElementNS(NS, "line");
            line.setAttribute("x1", (Math.cos(angle) * r1).toFixed(2));
            line.setAttribute("y1", (Math.sin(angle) * r1).toFixed(2));
            line.setAttribute("x2", (Math.cos(angle) * r2).toFixed(2));
            line.setAttribute("y2", (Math.sin(angle) * r2).toFixed(2));
            rays.appendChild(line);
        }
    }

    /* ---------- Hobbies: las galerías se llenan solas con su carpeta ---------- */
    var IMG_EXT = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;
    var VID_EXT = /\.(mp4|webm|ogv|mov)$/i;

    // Ordena "foto2" antes que "foto10"
    function byName(a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    }

    // Lee el listado de la carpeta que da el servidor (Live Server, python -m http.server...)
    function listFromServer(folder) {
        var base = new URL(folder + "/", location.href);
        return fetch(base.href).then(function (res) {
            if (!res.ok) throw new Error("sin listado");
            return res.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, "text/html");
            var names = [];
            doc.querySelectorAll("a[href]").forEach(function (a) {
                var url = new URL(a.getAttribute("href"), base);
                if (url.pathname.indexOf(base.pathname) !== 0) return;
                var name = decodeURIComponent(url.pathname.slice(base.pathname.length));
                if (!name || name.indexOf("/") !== -1) return;
                if ((IMG_EXT.test(name) || VID_EXT.test(name)) && names.indexOf(name) === -1) names.push(name);
            });
            if (!names.length) throw new Error("listado vacío");
            return names;
        });
    }

    // Respaldo: la lista generada por actualizar-galerias.ps1
    function listFromManifest(folder) {
        var all = window.GALERIAS || {};
        return (all[folder] || []).filter(function (n) { return IMG_EXT.test(n) || VID_EXT.test(n); });
    }

    function buildTile(folder, name) {
        var src = folder + "/" + encodeURIComponent(name);
        var fig = document.createElement("figure");

        if (VID_EXT.test(name)) {
            fig.className = "tile tile-video";
            fig.setAttribute("data-label", "Video");
            var v = document.createElement("video");
            v.controls = true;
            v.playsInline = true;
            v.preload = "metadata";
            v.src = src;
            v.addEventListener("error", function () { v.style.display = "none"; });
            fig.appendChild(v);
        } else {
            fig.className = "tile photo";
            fig.setAttribute("data-label", "Foto");
            var img = document.createElement("img");
            img.src = src;
            img.alt = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
            img.loading = "lazy";
            img.onerror = function () { img.remove(); };
            fig.appendChild(img);
        }
        return fig;
    }

    var ARROW = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
        'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';

    // Carrusel: una foto a la vez, con flechas, puntos, contador y deslizar con el dedo
    function buildCarousel(grid, folder, names) {
        var root = document.createElement("div");
        root.className = "carousel";
        root.tabIndex = 0;
        root.setAttribute("role", "region");
        root.setAttribute("aria-roledescription", "carrusel");
        root.setAttribute("aria-label", "Fotos de " + folder);

        var track = document.createElement("div");
        track.className = "carousel-track";
        var slides = names.map(function (n) { return buildTile(folder, n); });
        slides.forEach(function (s) { track.appendChild(s); });

        var prev = document.createElement("button");
        prev.type = "button";
        prev.className = "carousel-btn prev";
        prev.setAttribute("aria-label", "Anterior");
        prev.innerHTML = ARROW;

        var next = prev.cloneNode(true);
        next.className = "carousel-btn next";
        next.setAttribute("aria-label", "Siguiente");

        var foot = document.createElement("div");
        foot.className = "carousel-foot";
        var count = document.createElement("span");
        count.className = "carousel-count";
        var dots = document.createElement("div");
        dots.className = "carousel-dots";
        var dotBtns = slides.map(function (_, i) {
            var d = document.createElement("button");
            d.type = "button";
            d.setAttribute("aria-label", "Ir a la foto " + (i + 1));
            d.addEventListener("click", function () { go(i); });
            dots.appendChild(d);
            return d;
        });
        foot.appendChild(dots);
        foot.appendChild(count);

        root.appendChild(track);
        if (slides.length > 1) {
            root.appendChild(prev);
            root.appendChild(next);
        }
        grid.appendChild(root);
        grid.appendChild(foot);

        var current = -1;

        function index() {
            return Math.round(track.scrollLeft / (track.clientWidth || 1));
        }

        function go(i) {
            var total = slides.length;
            i = (i + total) % total; // al llegar al final regresa al inicio
            track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
        }

        function update() {
            var i = index();
            if (i === current) return;
            current = i;
            count.textContent = (i + 1) + " / " + slides.length;
            dotBtns.forEach(function (d, j) { d.setAttribute("aria-current", j === i ? "true" : "false"); });
            // El video que sale de pantalla se pausa
            slides.forEach(function (s, j) {
                var v = s.querySelector("video");
                if (v && j !== i) v.pause();
            });
        }

        prev.addEventListener("click", function () { go(index() - 1); });
        next.addEventListener("click", function () { go(index() + 1); });
        track.addEventListener("scroll", update, { passive: true });
        root.addEventListener("keydown", function (e) {
            if (e.target.tagName === "VIDEO") return;
            if (e.key === "ArrowLeft") { e.preventDefault(); go(index() - 1); }
            if (e.key === "ArrowRight") { e.preventDefault(); go(index() + 1); }
        });
        // Si cambia el tamaño de la ventana, se queda en la misma foto
        window.addEventListener("resize", function () {
            if (current >= 0) track.scrollLeft = current * track.clientWidth;
        });

        update();
    }

    function fillGallery(grid) {
        var folder = grid.getAttribute("data-folder");
        return listFromServer(folder)
            .catch(function () { return listFromManifest(folder); })
            .then(function (names) {
                names.sort(byName);
                grid.innerHTML = "";
                if (names.length) {
                    buildCarousel(grid, folder, names);
                } else {
                    var empty = document.createElement("p");
                    empty.className = "gallery-empty";
                    empty.textContent = "Agrega fotos a la carpeta " + folder + "/";
                    grid.appendChild(empty);
                }
                return names.length;
            });
    }

    /* ---------- Hobbies: cada carpeta abre su galería ---------- */
    document.querySelectorAll(".folder[data-open]").forEach(function (btn) {
        var dlg = document.getElementById(btn.getAttribute("data-open"));
        if (!dlg) return;

        // Llena cada apartado de la galería y escribe en la carpeta cuántos archivos hay en total
        var grids = Array.prototype.slice.call(dlg.querySelectorAll(".gallery-grid[data-folder]"));
        var meta = btn.querySelector("[data-count]");
        Promise.all(grids.map(fillGallery)).then(function (counts) {
            var total = counts.reduce(function (a, b) { return a + b; }, 0);
            if (meta) meta.textContent = total + (total === 1 ? " archivo" : " archivos");
        });

        btn.addEventListener("click", function () {
            if (typeof dlg.showModal === "function") dlg.showModal();
            else dlg.setAttribute("open", "");
            // Al abrir, los carruseles revisan en qué foto quedaron (contador y puntos)
            dlg.querySelectorAll(".carousel-track").forEach(function (t) {
                t.dispatchEvent(new Event("scroll"));
            });
        });
    });

    document.querySelectorAll("dialog.gallery").forEach(function (dlg) {
        // Cerrar con la X o tocando fuera de la carpeta (Esc ya cierra solo)
        dlg.addEventListener("click", function (e) {
            if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
        });

        // Al cerrar, los videos se pausan
        dlg.addEventListener("close", function () {
            dlg.querySelectorAll("video").forEach(function (v) { v.pause(); });
        });
    });

    /* ---------- Año del pie de página ---------- */
    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
})();