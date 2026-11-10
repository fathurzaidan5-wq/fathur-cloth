
import { animate, animateLayout, hover } from "https://cdn.jsdelivr.net/npm/motion@14/+esm";

/* ============== ANIMASI ============== */

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches

const A = (target, keyframes, options = {}) =>
  animate(target, keyframes, reduce
    ? { duration: 0, onComplete: options.onComplete, onUpdate: options.onUpdate }
    : options
  )

const snap = { type: "spring", stiffness: 1218, damping: 70 }
const ui = { type: "spring", stiffness: 305, damping: 33 }
const lively = { type: "spring", stiffness: 622, damping: 17 }

function gestur(node, {
  hover: sh = 1.1,
  tap = 1,
  drag = 1.2,
  putar = 0,
  bisaDrag = true
} = {}) {
  let hovering = false
  let down = false
  let dragging = false
  let sx = 0
  let sy = 0

  const pasang = () => {
    const scale = dragging ? drag : down ? tap : hovering ? sh : 1
    const rotate = hovering && !down && !dragging ? putar : 0
    A(node, { scale, rotate }, lively)
  }

  hover(node, () => {
    hovering = true
    pasang()
    return () => {
      hovering = false
      pasang()
    }
  })

  node.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return
    down = true
    sx = e.clientX
    sy = e.clientY
    pasang()
  })

  node.addEventListener("pointermove", (e) => {
    if (!down || !bisaDrag || e.pointerType === "touch") return

    const dx = e.clientX - sx
    const dy = e.clientY - sy

    if (!dragging) {
      if (Math.hypot(dx, dy) < 6) return
      dragging = true
      node.setPointerCapture(e.pointerId)
      node.classList.add("sedang-drag")
      pasang()
    }

    A(node, { x: dx, y: dy }, { duration: 0 })
  })

  const selesai = () => {
    if (!down) return

    if (dragging) node._dragAt = performance.now()

    down = false
    dragging = false
    node.classList.remove("sedang-drag")

    A(node, { x: 0, y: 0 }, {
      type: "spring",
      stiffness: 500,
      damping: 30
    })

    pasang()
  }

  node.addEventListener("pointerup", selesai)
  node.addEventListener("pointercancel", selesai)
  node.addEventListener("pointerleave", () => {
    if (!dragging) selesai()
  })
}

/* ============== UTILITAS ============== */

const $ = (s) => document.querySelector(s)

const konfig = JSON.parse($("#konfig").textContent)

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(n)

function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag)

  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue

    if (k === "class") node.className = v
    else if (k === "style") node.style.cssText = v
    else if (k.startsWith("on")) {
      node.addEventListener(k.slice(2), v)
    } else {
      node.setAttribute(k, v === true ? "" : v)
    }
  }

  for (const kid of kids.flat()) {
    if (kid != null) node.append(kid)
  }

  return node
}

/* ============== API ============== */

async function api(url, opts = {}) {
  const headers = { ...(opts.headers || {}) }

  // FormData tidak boleh diberi Content-Type JSON.
  // Browser akan mengatur multipart boundary secara otomatis.
  if (!(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(url, {
    ...opts,
    headers
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.pesan || "Terjadi kesalahan. Coba lagi.")
  }

  return data
}

/* ============== FOTO PRODUK ============== */

// Menolak nilai kosong, null, dan string "None" dari database.
function alamatFoto(p) {
  const foto = p?.foto

  if (typeof foto !== "string" || !foto.trim()) {
    return null
  }

  const nilai = foto.trim()

  if (["none", "null", "undefined"].includes(nilai.toLowerCase())) {
    return null
  }

  return nilai
}

// Satu fungsi foto untuk katalog, detail, coverflow, dan keranjang.
function visualProduk(p, className = "foto-produk") {
  const src = alamatFoto(p)

  if (!src) {
    return el("span", {
      class: "glyph"
    }, p.emoji || "👕")
  }

  const img = el("img", {
    class: className,
    src,
    alt: p.nama || "Foto produk",
    loading: "lazy"
  })

  img.addEventListener("error", () => {
    img.replaceWith(
      el("span", {
        class: "glyph"
      }, p.emoji || "👕")
    )
  }, { once: true })

  return img
}

/* ============== STATE ============== */

const state = {
  produk: [],
  kategori: "Semua",
  keranjang: muat()
}

const kartuMap = new Map()

function muat() {
  try {
    return JSON.parse(localStorage.getItem("fth-keranjang")) || []
  } catch {
    return []
  }
}

function simpan() {
  try {
    localStorage.setItem(
      "fth-keranjang",
      JSON.stringify(state.keranjang)
    )
  } catch {}
}

const jumlahItem = () =>
  state.keranjang.reduce((n, i) => n + i.qty, 0)

/* ============== STEPPER JUMLAH ============== */

const ikon = {
  plus: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 9h10M9 4v10"/></svg>',
  minus: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 9h10"/></svg>'
}

function stepper({ value = 1, min = 1, max = 99, onChange }) {
  let current = value

  const box = el("div", {
    class: "st-value",
    role: "status",
    "aria-label": "Jumlah"
  })

  let digit = el("span", {
    class: "st-digit"
  }, String(current))

  box.append(digit)

  const tampil = (next, dir) => {
    const lama = digit

    digit = el("span", {
      class: "st-digit"
    }, String(next))

    box.append(digit)

    A(lama, {
      y: -18 * dir,
      opacity: 0,
      filter: "blur(4px)"
    }, {
      ...snap,
      opacity: { duration: 0.12 }
    }).then(() => lama.remove())

    A(digit, {
      y: [18 * dir, 0],
      opacity: [0, 1],
      filter: ["blur(4px)", "blur(0px)"]
    }, ui)
  }

  const step = (change) => {
    const next = Math.min(max, Math.max(min, current + change))

    if (next === current) {
      A(box, {
        x: [0, 5 * change, -3 * change, 0]
      }, { duration: 0.3 })
      return
    }

    current = next
    tampil(next, change)
    onChange?.(next)
  }

  const tombol = (change, label) => {
    let tunggu
    let ulang

    const b = el("button", {
      class: "st-step",
      type: "button",
      "aria-label": label
    })

    b.innerHTML = change > 0 ? ikon.plus : ikon.minus

    const berhenti = () => {
      clearTimeout(tunggu)
      clearInterval(ulang)
    }

    b.addEventListener("pointerdown", () => {
      step(change)
      A(b, { scale: 0.88 }, snap)

      tunggu = setTimeout(() => {
        ulang = setInterval(() => step(change), 80)
      }, 400)
    })

    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) {
      b.addEventListener(ev, () => {
        berhenti()
        A(b, { scale: 1 }, lively)
      })
    }

    b.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        step(change)
      }
    })

    return b
  }

  const node = el(
    "div",
    { class: "stepper" },
    tombol(-1, "Kurangi jumlah"),
    box,
    tombol(1, "Tambah jumlah")
  )

  return {
    node,
    get value() {
      return current
    }
  }
}

/* ============== KARTU PRODUK ============== */

function kartu(p) {
  let ukuran = p.ukuran[0]
  let warna = p.warna[0]

  const glyph = visualProduk(p)

  const tile = el("div", {
    class: "tile",
    style: `--tile:${warna.hex}`,
    "data-layout-id": `tile-${p.id}`,
    role: "button",
    tabindex: "0",
    "aria-label": `Lihat detail ${p.nama}`
  }, glyph)

  const namaWarna = el("span", {
    class: "label"
  }, warna.nama)

  const swatchBtns = p.warna.map((w) =>
    el("button", {
      class: "swatch",
      type: "button",
      style: `background:${w.hex}`,
      "aria-label": `Warna ${w.nama}`,
      "aria-pressed": String(w === warna),

      onclick: () => {
        warna = w
        tile.style.setProperty("--tile", w.hex)
        namaWarna.textContent = w.nama

        swatchBtns.forEach((b) => {
          b.setAttribute("aria-pressed", String(b === btnW(w)))
        })

        A(glyph, { scale: [0.9, 1] }, lively)
      }
    })
  )

  const btnW = (w) => swatchBtns[p.warna.indexOf(w)]

  const sizeBtns = p.ukuran.map((u) =>
    el("button", {
      class: "sz",
      type: "button",
      "aria-pressed": String(u === ukuran),

      onclick: () => {
        ukuran = u

        sizeBtns.forEach((b) => {
          b.setAttribute(
            "aria-pressed",
            String(b.textContent === u)
          )
        })
      }
    }, u)
  )

  const qty = stepper({
    value: 1,
    min: 1,
    max: 99
  })

  const masuk = (sumber) => {
    tambahKeKeranjang(p, ukuran, warna.nama, qty.value)
    terbang(sumber)
  }

  const tambah = el("button", {
    class: "btn tambah",
    type: "button",
    onclick: () => masuk(tile)
  }, "Tambah ke keranjang")

  const card = el("article", {
    class: "kartu",
    "data-id": p.id
  },
    tile,

    el("div", {
      class: "kartu-head"
    },
      el("strong", {}, p.nama),
      el("span", {
        class: "harga"
      }, rupiah(p.harga))
    ),

    el("div", {
      class: "baris"
    },
      el("div", {
        class: "swatches",
        role: "group",
        "aria-label": "Pilih warna"
      }, swatchBtns),
      namaWarna
    ),

    el("div", {
      class: "baris"
    },
      el("span", {
        class: "label"
      }, "Ukuran"),
      el("div", {
        class: "ukuran",
        role: "group",
        "aria-label": "Pilih ukuran"
      }, sizeBtns)
    ),

    el("div", {
      class: "baris"
    },
      el("span", {
        class: "label"
      }, "Jumlah"),
      qty.node
    ),

    tambah
  )

  // Tampilan detail produk menggunakan foto yang sama.
  const tileBesar = el("div", {
    class: "tile besar",
    "data-layout-id": `tile-${p.id}`
  }, visualProduk(p))

  const detail = el("article", {
    class: "detail"
  },
    tileBesar,

    el("div", {
      class: "detail-info"
    },
      el("h3", {}, p.nama),

      el("p", {
        class: "harga"
      }, rupiah(p.harga)),

      el("p", {}, `Kategori ${p.kategori}.`),

      el("p", {}, `Ukuran tersedia: ${p.ukuran.join(", ")}.`),

      el("p", {}, `Warna tersedia: ${p.warna.map((w) => w.nama).join(", ")}.`),

      el("p", {
        class: "catatan"
      }, "Ukuran, warna, dan jumlah mengikuti pilihan di kartu produk."),

      el("div", {
        class: "detail-aksi"
      },
        el("button", {
          class: "btn",
          type: "button",
          onclick: () => masuk(tileBesar)
        }, "Tambah ke keranjang"),

        el("button", {
          class: "btn ghost",
          type: "button",
          onclick: () => tutup()
        }, "Tutup")
      )
    )
  )

  const buka = () => animateLayout(() => {
    tileBesar.style.setProperty("--tile", warna.hex)
    card.replaceWith(detail)
  })

  const tutup = () => animateLayout(() => {
    detail.replaceWith(card)
  })

  tile.onclick = buka

  tile.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      buka()
    }
  }

  kartuMap.set(p.id, card)

  return card
}

/* ============== KERANJANG ============== */

function tambahKeKeranjang(p, ukuran, warna, qty) {
  const key = `${p.id}|${ukuran}|${warna}`

  const ada = state.keranjang.find((i) => i.key === key)

  if (ada) {
    ada.qty = Math.min(99, ada.qty + qty)
  } else {
    state.keranjang.push({
      key,
      id: p.id,
      ukuran,
      warna,
      qty
    })
  }

  simpan()
}

async function terbang(sumber) {
  const basket = $("#basket")

  const dari = sumber.getBoundingClientRect()
  const ke = basket.getBoundingClientRect()

  const dx = ke.left + ke.width / 2 -
    (dari.left + dari.width / 2)

  const dy = ke.top + ke.height / 2 -
    (dari.top + dari.height / 2)

  const klon = sumber.cloneNode(true)

  klon.classList.add("fly")

  for (const a of [
    "data-layout-id",
    "tabindex",
    "role",
    "aria-label"
  ]) {
    klon.removeAttribute(a)
  }

  klon.style.cssText +=
    `;left:${dari.left}px;top:${dari.top}px;width:${dari.width}px;height:${dari.height}px`

  document.body.append(klon)

  await A(klon, {
    x: dx,
    y: dy,
    scale: 40 / dari.width,
    opacity: [1, 1, 0]
  }, {
    duration: 0.55,
    x: { ease: [0.5, 0, 0.9, 0.6] },
    y: { ease: [0.1, 0.5, 0.4, 1] },
    opacity: { times: [0, 0.9, 1] }
  })

  klon.remove()

  badge(true)

  await A(basket, {
    scale: 1.2
  }, { duration: 0.08 })

  A(basket, {
    scale: 1
  }, {
    type: "spring",
    stiffness: 500,
    damping: 12
  })

  A($(".ring"), {
    scale: [1, 2.2],
    opacity: [0.8, 0]
  }, {
    duration: 0.5,
    ease: "easeOut"
  })
}

function badge(pop = false) {
  const b = $("#badge")
  const n = jumlahItem()

  b.textContent = String(n)
  b.hidden = n === 0

  if (pop && n > 0) {
    A(b, { scale: [1.5, 1] }, lively)
  }
}

/* ============== LACI KERANJANG ============== */

const drawer = $("#drawer")
const overlay = $("#overlay")

let laciTerbuka = false

async function bukaLaci() {
  if (laciTerbuka) return

  laciTerbuka = true

  renderKeranjang()

  overlay.hidden = false
  drawer.hidden = false

  A(overlay, { opacity: [0, 1] }, {
    duration: 0.2
  })

  A(drawer, { x: ["100%", "0%"] }, ui)

  $("#d-close").focus()
}

async function tutupLaci() {
  if (!laciTerbuka) return

  laciTerbuka = false

  A(overlay, { opacity: 0 }, {
    duration: 0.2
  })

  await A(drawer, { x: "100%" }, snap)

  drawer.hidden = true
  overlay.hidden = true
}

const judul = (t) => {
  $("#d-title").textContent = t
}

const ganti = async (render) => {
  const body = $("#d-body")

  await A(body, {
    opacity: 0,
    x: -12
  }, { duration: 0.12 })

  render()

  A(body, {
    opacity: [0, 1],
    x: [12, 0]
  }, ui)
}

/* ============== ISI KERANJANG ============== */

let tokenRingkasan = 0
let totalLama = 0

function renderKeranjang() {
  judul("Keranjang")

  const body = $("#d-body")
  body.replaceChildren()

  if (!state.keranjang.length) {
    body.append(
      el("p", {
        class: "kosong"
      }, "Keranjang masih kosong."),

      el("button", {
        class: "btn ghost",
        type: "button",
        onclick: tutupLaci
      }, "Pilih baju")
    )

    return
  }

  const daftar = el("ul", {
    class: "rows"
  })

  for (const item of state.keranjang) {
    const p = state.produk.find((x) => x.id === item.id)

    if (!p) continue

    const w = p.warna.find((x) => x.nama === item.warna) || p.warna[0]

    const row = el("li", {
      class: "row"
    },
      el("div", {
        class: "mini",
        style: `--tile:${w.hex}`
      }, visualProduk(p)),

      el("div", {
        class: "row-info"
      },
        el("strong", {}, p.nama),
        el("span", {}, `${item.ukuran} · ${item.warna}`),
        el("span", {}, rupiah(p.harga))
      ),

      el("div", {
        class: "row-ctl"
      },
        stepper({
          value: item.qty,
          onChange: (q) => {
            item.qty = q
            simpan()
            badge()
            hitungRingkasan()
          }
        }).node,

        el("button", {
          class: "link",
          type: "button",
          onclick: () => hapusItem(item, row)
        }, "Hapus")
      )
    )

    daftar.append(row)
  }

  body.append(
    daftar,

    el("div", {
      class: "sum",
      id: "sum"
    },
      el("div", {},
        el("span", {}, "Subtotal"),
        el("span", {
          id: "s-sub"
        }, "...")
      ),

      el("div", {
        id: "r-diskon",
        hidden: true
      },
        el("span", {}, "Diskon 10%"),
        el("span", {
          id: "s-diskon"
        })
      ),

      el("div", {},
        el("span", {}, "Ongkir"),
        el("span", {
          id: "s-ongkir"
        }, "...")
      ),

      el("div", {
        class: "total"
      },
        el("span", {}, "Total"),
        el("span", {
          id: "s-total"
        }, "...")
      )
    ),

    el("p", {
      class: "catatan",
      id: "s-catatan"
    }, "Gratis ongkir untuk belanja mulai Rp500.000. Diskon 10% mulai Rp1.000.000."),

    el("p", {
      class: "error",
      id: "s-error",
      role: "alert",
      hidden: true
    }),

    el("button", {
      class: "btn",
      type: "button",
      onclick: () => ganti(renderBayar)
    }, "Lanjut ke pembayaran")
  )

  totalLama = 0
  hitungRingkasan()
}

async function hapusItem(item, row) {
  await A(row, {
    opacity: 0,
    height: 0
  }, {
    duration: 0.22,
    ease: "easeOut"
  })

  state.keranjang = state.keranjang.filter((i) => i !== item)

  simpan()
  badge()
  renderKeranjang()
}

/* ============== HITUNG HARGA ============== */

async function hitungRingkasan() {
  if (!state.keranjang.length) return

  const token = ++tokenRingkasan

  try {
    const d = await api("/api/ringkasan", {
      method: "POST",
      body: JSON.stringify({
        items: state.keranjang
      })
    })

    if (token !== tokenRingkasan || !$("#sum")) return

    $("#s-error").hidden = true
    $("#s-sub").textContent = rupiah(d.subtotal)

    $("#r-diskon").hidden = d.diskon === 0
    $("#s-diskon").textContent = "-" + rupiah(d.diskon)

    $("#s-ongkir").textContent =
      d.ongkir === 0 ? "Gratis" : rupiah(d.ongkir)

    const out = $("#s-total")

    const nilaiAwal = totalLama
    const nilaiAkhir = d.total

    A(
      (progress) => {
        out.textContent = rupiah(
          Math.round(nilaiAwal + (nilaiAkhir - nilaiAwal) * progress)
        )
      },
      [0, 1],
      {
        duration: reduce ? 0 : 0.4,
        ease: "easeOut"
      }
    )

    totalLama = nilaiAkhir

  } catch (e) {
    const err = $("#s-error")

    if (err) {
      err.textContent = e.message
      err.hidden = false
    }
  }
}

/* ============== TOMBOL BAYAR ============== */

function tombolTahan(label, onSelesai) {
  const fill = el("span", {
    class: "hold-fill"
  })

  const b = el("button", {
    class: "hold",
    type: "button"
  },
    fill,
    el("span", {
      class: "hold-label"
    }, label)
  )

  let anim = null
  let aktif = false
  let selesai = false

  const mulai = () => {
    if (aktif || selesai || b.disabled) return

    aktif = true

    anim = A(fill, {
      scaleX: 1
    }, {
      duration: 1.1,
      ease: "linear",

      onComplete: () => {
        if (aktif) {
          aktif = false
          selesai = true
          onSelesai()
        }
      }
    })
  }

  const batal = () => {
    if (!aktif) return

    aktif = false
    anim?.stop()

    A(fill, {
      scaleX: 0
    }, {
      duration: 0.25,
      ease: "easeOut"
    })
  }

  b.addEventListener("pointerdown", mulai)

  for (const ev of [
    "pointerup",
    "pointerleave",
    "pointercancel"
  ]) {
    b.addEventListener(ev, batal)
  }

  b.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
      e.preventDefault()
      mulai()
    }
  })

  b.addEventListener("keyup", batal)

  return {
    node: b,

    reset() {
      selesai = false
      aktif = false

      A(fill, {
        scaleX: 0
      }, {
        duration: 0.25
      })
    }
  }
}

/* ============== PEMBAYARAN ============== */

function renderBayar() {
  judul("Pembayaran")

  const body = $("#d-body")
  body.replaceChildren()

  const error = el("p", {
    class: "error",
    role: "alert",
    hidden: true
  })

  const form = el("form", {
    class: "form",
    autocomplete: "on",
    onsubmit: (e) => e.preventDefault()
  },
    el("label", {},
      "Nama penerima",
      el("input", {
        name: "nama",
        autocomplete: "name",
        required: true
      })
    ),

    el("label", {},
      "Nomor HP",
      el("input", {
        name: "telepon",
        type: "tel",
        autocomplete: "tel",
        placeholder: "081234567890",
        required: true
      })
    ),

    el("label", {},
      "Alamat lengkap",
      el("textarea", {
        name: "alamat",
        autocomplete: "street-address",
        required: true,
        placeholder: "Jalan, nomor, kota, kode pos"
      })
    ),

    el("fieldset", {},
      el("legend", {}, "Metode pembayaran"),

      el("div", {
        class: "chips"
      },
        Object.entries(konfig.metode).map(([kode, nama], i) =>
          el("label", {
            class: "metode"
          },
            el("input", {
              type: "radio",
              name: "metode",
              value: kode,
              checked: i === 0
            }),
            el("span", {}, nama)
          )
        )
      )
    ),

    error
  )

  const tahan = tombolTahan("Tahan untuk bayar", async () => {
    if (!form.reportValidity()) {
      tahan.reset()
      return
    }

    const data = Object.fromEntries(new FormData(form))

    tahan.node.disabled = true

    try {
      const hasil = await api("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          items: state.keranjang
        })
      })

      state.keranjang = []
      simpan()
      badge()

      ganti(() => renderSukses(hasil))

    } catch (e) {
      error.textContent = e.message
      error.hidden = false

      tahan.node.disabled = false
      tahan.reset()
    }
  })

  body.append(form, tahan.node)
}

/* ============== PESANAN SUKSES ============== */

function renderSukses(h) {
  judul("Pesanan diterima")

  const body = $("#d-body")
  body.replaceChildren()

  const wrap = el("div", {
    class: "sukses"
  })

  wrap.innerHTML =
    '<svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="32"/><path d="M22 37l10 10 18-21" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>'

  wrap.append(
    el("h3", {}, "Terima kasih!"),

    el("span", {
      class: "kode"
    }, h.id),

    el("p", {}, `Total ${rupiah(h.total)} via ${h.metode}.`),

    el("p", {}, h.instruksi),

    el("button", {
      class: "btn",
      type: "button",
      onclick: tutupLaci
    }, "Selesai")
  )

  body.append(wrap)

  A(wrap.querySelector("path"), {
    strokeDashoffset: [1, 0]
  }, {
    duration: 0.5,
    ease: "easeOut",
    delay: 0.15
  })
}

/* ============== FILTER KATALOG ============== */

function renderFilter() {
  const semua = [
    "Semua",
    ...new Set(state.produk.map((p) => p.kategori))
  ]

  if (!semua.includes(state.kategori)) {
    state.kategori = "Semua"
  }

  $("#filter").replaceChildren(
    ...semua.map((k) =>
      el("button", {
        class: "pill",
        type: "button",
        "aria-pressed": String(k === state.kategori),

        onclick: () => {
          state.kategori = k
          renderFilter()
          renderKatalog()
        }
      }, k)
    )
  )
}

function renderKatalog(barusaja) {
  const grid = $("#grid")

  grid.replaceChildren()
  kartuMap.clear()

  const daftar = state.produk.filter((p) =>
    state.kategori === "Semua" ||
    p.kategori === state.kategori
  )

  if (!daftar.length) {
    grid.append(
      el("p", {
        class: "kosong"
      }, "Belum ada produk di kategori ini. Tambahkan lewat Kelola katalog.")
    )
    return
  }

  for (const p of daftar) {
    const k = kartu(p)

    grid.append(k)

    if (p.id === barusaja) {
      A(k, {
        opacity: [0, 1],
        y: [16, 0]
      }, ui)
    }
  }
}

/* ============== MUAT PRODUK ============== */

async function muatProduk(barusaja) {
  state.produk = await api("/api/produk")

  state.keranjang = state.keranjang.filter((i) =>
    state.produk.some((p) => p.id === i.id)
  )

  simpan()
  badge()

  renderFilter()
  renderKatalog(barusaja)
  renderCoverflow()
  renderAdminList()
}

/* ============== COVERFLOW ============== */

const cfBox = $("#coverflow")
const cfList = $("#cf-list")

function petakan(v, masuk, keluar) {
  if (v <= masuk[0]) return keluar[0]

  for (let i = 1; i < masuk.length; i++) {
    if (v <= masuk[i]) {
      const t = (v - masuk[i - 1]) /
        (masuk[i] - masuk[i - 1])

      return keluar[i - 1] +
        (keluar[i] - keluar[i - 1]) * t
    }
  }

  return keluar[keluar.length - 1]
}

function perbaruiCoverflow() {
  const items = [...cfList.children]

  if (!items.length) return

  const box = cfBox.getBoundingClientRect()
  const lebar = items[0].offsetWidth

  cfList.style.paddingInline =
    `${Math.max(0, (box.width - lebar) / 2)}px`

  const k = lebar / 350

  for (const li of items) {
    const r = li.getBoundingClientRect()

    const o = r.left + r.width / 2 -
      (box.left + box.width / 2)

    const rotateY = petakan(
      o,
      [-200 * k, 0, 200 * k],
      [20, 0, -20]
    )

    const scale = petakan(
      o,
      [-200 * k, 0, 200 * k],
      [0.7, 1, 0.7]
    )

    const x = petakan(
      o,
      [-800 * k, -200 * k, 200 * k, 800 * k],
      [100, 0, 0, -100]
    )

    li.firstChild.style.transform =
      `perspective(500px) translateX(${x}%) rotateY(${rotateY}deg) scale(${scale})`

    li.style.zIndex =
      Math.max(0, Math.round(1000 - Math.abs(o)))
  }
}

function renderCoverflow() {
  cfList.replaceChildren()

  cfList.append(
    ...state.produk.map((p) => {
      const li = el("li", {
        class: "cf-item"
      })

      // Foto produk digunakan pada coverflow.
      const tile = el("div", {
        class: "tile",
        style: `--tile:${p.warna[0].hex}`
      }, visualProduk(p))

      gestur(tile)

      li.append(
        el("button", {
          class: "cf-btn",
          type: "button",
          "aria-label": `${p.nama}, ${rupiah(p.harga)}`,

          onclick: () => {
            if (performance.now() - (tile._dragAt || 0) < 300) {
              return
            }

            klikCoverflow(p.id, li)
          }
        },
          tile,

          el("span", {
            class: "cf-nama"
          }, p.nama),

          el("span", {
            class: "harga"
          }, rupiah(p.harga))
        )
      )

      return li
    })
  )

  requestAnimationFrame(perbaruiCoverflow)
}

function klikCoverflow(id, li) {
  const r = li.getBoundingClientRect()
  const box = cfBox.getBoundingClientRect()

  const jarak = r.left + r.width / 2 -
    (box.left + box.width / 2)

  if (Math.abs(jarak) > r.width * 0.3) {
    cfBox.scrollTo({
      left: cfBox.scrollLeft + jarak,
      behavior: reduce ? "auto" : "smooth"
    })

    return
  }

  if (state.kategori !== "Semua") {
    state.kategori = "Semua"
    renderFilter()
    renderKatalog()
  }

  const card = kartuMap.get(id)

  if (!card || !card.isConnected) return

  card.scrollIntoView({
    block: "center",
    behavior: reduce ? "auto" : "smooth"
  })

  setTimeout(() => {
    card.querySelector(".tile")?.click()
  }, reduce ? 0 : 450)
}

let rafCf = 0

cfBox.addEventListener("scroll", () => {
  cancelAnimationFrame(rafCf)
  rafCf = requestAnimationFrame(perbaruiCoverflow)
}, { passive: true })

addEventListener("resize", perbaruiCoverflow)

/* ============== ADMIN ============== */

const adminDlg = $("#admin")

function renderAdminList() {
  const ul = $("#admin-list")

  if (!ul) return

  ul.replaceChildren(
    ...state.produk.map((p) =>
      el("li", {},
        el("span", {},
          `${p.nama} · ${rupiah(p.harga)}`
        ),

        el("button", {
          class: "link",
          type: "button",

          onclick: async () => {
            try {
              await api(`/api/produk/${p.id}`, {
                method: "DELETE"
              })

              await muatProduk()

            } catch (e) {
              alert(e.message)
            }
          }
        }, "Hapus")
      )
    )
  )
}

$("#buka-admin")?.addEventListener("click", () => {
  adminDlg.showModal()
})

$("#admin-tutup").addEventListener("click", () => {
  adminDlg.close()
})

// PENTING: FormData mengirim foto asli ke Flask.
$("#form-produk").addEventListener("submit", async (e) => {
  e.preventDefault()

  const f = e.currentTarget
  const fd = new FormData(f)
  const err = $("#admin-error")

  try {
    const file = fd.get("foto")

    if (!(file instanceof File) || !file.size) {
      throw new Error("Pilih foto produk terlebih dahulu.")
    }

    const baru = await api("/api/produk", {
      method: "POST",
      body: fd
    })

    err.hidden = true

    f.reset()
    state.kategori = "Semua"

    adminDlg.close()

    await muatProduk(baru.id)

    $("#katalog").scrollIntoView({
      behavior: "smooth"
    })

  } catch (ex) {
    err.textContent = ex.message
    err.hidden = false
  }
})

/* ============== HEADER DAN HERO ============== */

const header = $("#header")

let terakhir = 0
let tersembunyi = false

addEventListener("scroll", () => {
  const y = scrollY

  const sembunyi =
    y > terakhir &&
    y > 150 &&
    !laciTerbuka

  if (sembunyi !== tersembunyi) {
    tersembunyi = sembunyi

    A(header, {
      y: sembunyi ? "-110%" : "0%"
    }, {
      duration: 0.3,
      ease: "easeInOut"
    })
  }

  terakhir = y
}, { passive: true })

$("#basket").addEventListener("click", bukaLaci)
$("#d-close").addEventListener("click", tutupLaci)

overlay.addEventListener("click", tutupLaci)

addEventListener("keydown", (e) => {
  if (e.key === "Escape") tutupLaci()
})

// Animasi logo FTH.
const hurufFth = [...document.querySelectorAll(".huruf")]

Promise.all(
  hurufFth.map((h, i) =>
    A(h, {
      y: ["105%", "0%"]
    }, {
      ...ui,
      delay: 0.1 + i * 0.09
    })
  )
).then(() => {
  hurufFth.forEach((h, i) => {
    A(h, {
      y: ["0%", "-7%", "0%"]
    }, {
      duration: 0.6,
      ease: "easeInOut",
      delay: i * 0.08
    })
  })

  document.querySelectorAll(".hero-logo .mask").forEach((m, i) => {
    m.style.overflow = "visible"

    gestur(m, {
      putar: [-4, 0, 4][i % 3]
    })
  })
})

gestur($(".logo"), {
  bisaDrag: false
})

/* ============== SCROLL REVEAL ============== */

const fthRevealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("fth-muncul")
        fthRevealObserver.unobserve(entry.target)
      }
    })
  },
  {
    threshold: 0.12
  }
)

function fthAmatiProduk() {
  document.querySelectorAll(
    "#grid .kartu:not(.fth-diamati)"
  ).forEach((kartu) => {
    kartu.classList.add("fth-diamati")
    fthRevealObserver.observe(kartu)
  })
}

const fthGrid = $("#grid")

if (fthGrid) {
  fthAmatiProduk()

  const fthMutationObserver = new MutationObserver(() => {
    fthAmatiProduk()
  })

  fthMutationObserver.observe(fthGrid, {
    childList: true,
    subtree: true
  })
}

/* ============== MULAI APLIKASI ============== */

badge()

muatProduk().catch((e) => {
  $("#grid").append(
    el("p", {
      class: "kosong"
    }, e.message)
  )
})
