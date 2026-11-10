"""
FathurCloth (FTH) - Web toko baju online
Backend: Python + Flask  |  Animasi: Motion (motion.dev)

Peta materi UAS -> kode di file ini:
  a. Tipe data & variabel     -> konstanta (str, int, float, bool, tuple, dict, list)
  b. String, bilangan, operator -> format_rupiah(), hitung_ringkasan(), parse_warna()
  c. Seleksi kondisi          -> if / elif / else di validasi & hitung_ringkasan()
  d. Perulangan               -> for / enumerate di hitung_ringkasan(), parse_warna()
  e. List dan tuple           -> UKURAN_VALID (tuple), daftar produk (list)
  f. Fungsi                   -> semua fungsi bertanda def
  g. Modul & eksepsi          -> import json/os/re/uuid, ValidasiError, try/except
"""
import json
import os
import re
import threading
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename

from flask import Flask, jsonify, render_template, request

# ---------------------------------------------------------------- a. Tipe data
NAMA_BRAND = "FathurCloth"          # str
SINGKATAN = "FTH"                   # str
ONGKIR = 15000                      # int
GRATIS_ONGKIR_MIN = 500000          # int
DISKON_MIN = 1000000                # int
DISKON_PERSEN = 10                  # int
BOLEH_ADMIN = True                  # bool

UKURAN_VALID = ("S", "M", "L", "XL", "XXL")          # tuple (tidak bisa diubah)
KATEGORI = ("Atasan", "Bawahan", "Luaran", "Aksesoris")
METODE_BAYAR = {                                     # dict
    "transfer": "Transfer Bank",
    "qris": "QRIS",
    "ewallet": "E-Wallet",
    "cod": "Bayar di Tempat",
}
INSTRUKSI = {
    "transfer": "Transfer ke BCA 123-456-7890 a.n. FathurCloth, maksimal 24 jam.",
    "qris": "Kode QRIS akan dikirim ke nomor WhatsApp Anda.",
    "ewallet": "Tautan pembayaran DANA/OVO dikirim ke nomor WhatsApp Anda.",
    "cod": "Siapkan uang pas saat kurir tiba.",
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PRODUK_FILE = os.path.join(DATA_DIR, "produk.json")
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

os.makedirs(UPLOAD_DIR, exist_ok=True)

def foto_diizinkan(nama):
    return (
        "." in nama
        and nama.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )
PESANAN_FILE = os.path.join(DATA_DIR, "pesanan.json")
kunci = threading.Lock()

PRODUK_AWAL = [  # list berisi dict
    {"id": "kaos-boxy", "nama": "Kaos Boxy FTH", "harga": 129000, "kategori": "Atasan", "emoji": "👕",
     "ukuran": ["S", "M", "L", "XL"],
     "warna": [{"nama": "Hitam", "hex": "#1b1f24"}, {"nama": "Putih", "hex": "#f1f1ec"}, {"nama": "Biru", "hex": "#2a45f5"}]},
    {"id": "hoodie-zip", "nama": "Hoodie Zip Heavy", "harga": 289000, "kategori": "Luaran", "emoji": "🧥",
     "ukuran": ["M", "L", "XL", "XXL"],
     "warna": [{"nama": "Abu", "hex": "#8d949e"}, {"nama": "Hitam", "hex": "#1b1f24"}]},
    {"id": "kemeja-linen", "nama": "Kemeja Linen Santai", "harga": 199000, "kategori": "Atasan", "emoji": "👔",
     "ukuran": ["S", "M", "L", "XL"],
     "warna": [{"nama": "Krem", "hex": "#d9cdb4"}, {"nama": "Hijau", "hex": "#5d7a5b"}]},
    {"id": "celana-cargo", "nama": "Celana Cargo Lurus", "harga": 249000, "kategori": "Bawahan", "emoji": "👖",
     "ukuran": ["S", "M", "L", "XL"],
     "warna": [{"nama": "Olive", "hex": "#6b6b3e"}, {"nama": "Hitam", "hex": "#1b1f24"}, {"nama": "Khaki", "hex": "#b9a37a"}]},
    {"id": "jaket-coach", "nama": "Jaket Coach Windbreaker", "harga": 319000, "kategori": "Luaran", "emoji": "🧥",
     "ukuran": ["M", "L", "XL"],
     "warna": [{"nama": "Navy", "hex": "#1f2d57"}, {"nama": "Merah", "hex": "#c0392b"}]},
    {"id": "topi-fth", "nama": "Topi Baseball FTH", "harga": 89000, "kategori": "Aksesoris", "emoji": "🧢",
     "ukuran": ["M", "L"],
     "warna": [{"nama": "Hitam", "hex": "#1b1f24"}, {"nama": "Putih", "hex": "#f1f1ec"}]},
]


# ---------------------------------------------------------------- g. Eksepsi
class ValidasiError(Exception):
    """Dilempar saat input pengguna tidak valid."""


# ---------------------------------------------------------------- f. Fungsi
def baca_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def simpan_json(path, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    with kunci:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def ambil_produk():
    produk = baca_json(PRODUK_FILE, None)
    if produk is None:                    
        simpan_json(PRODUK_FILE, PRODUK_AWAL)
        produk = list(PRODUK_AWAL)
    return produk


def format_rupiah(angka):
    return "Rp" + f"{angka:,}".replace(",", ".")


def parse_warna(teks):
    """'Hitam=#111111, Putih=#f5f5f5' -> [{'nama': 'Hitam', 'hex': '#111111'}, ...]"""
    hasil = []
    for bagian in str(teks).split(","):                      # perulangan
        bagian = bagian.strip()
        if not bagian:
            continue
        if "=" not in bagian:
            raise ValidasiError(f"Format warna '{bagian}' salah. Contoh: Hitam=#111111")
        nama, kode = (x.strip() for x in bagian.split("=", 1))
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", kode):
            raise ValidasiError(f"Kode warna '{kode}' harus berbentuk #RRGGBB.")
        if len(nama) < 2:
            raise ValidasiError("Nama warna minimal 2 huruf.")
        hasil.append({"nama": nama.title(), "hex": kode.lower()})
    if not hasil:
        raise ValidasiError("Isi minimal satu warna.")
    return hasil


def validasi_produk(data, foto=None):
    nama = str(data.get("nama", "")).strip()

    if not 2 <= len(nama) <= 40:
        raise ValidasiError("Nama produk harus 2-40 karakter.")

    try:
        harga = int(data.get("harga"))
    except (TypeError, ValueError):
        raise ValidasiError("Harga harus berupa angka.")

    if not 1000 <= harga <= 10_000_000:
        raise ValidasiError("Harga harus antara Rp1.000 dan Rp10.000.000.")

    kategori = data.get("kategori")
    if kategori not in KATEGORI:
        raise ValidasiError("Pilih kategori yang tersedia.")

    emoji = str(data.get("emoji", "")).strip() or "👕"

    if len(emoji) > 4:
        raise ValidasiError("Ikon cukup satu emoji.")

    dipilih = data.get("ukuran", [])

    if isinstance(dipilih, str):
        dipilih = [dipilih]

    ukuran = [u for u in UKURAN_VALID if u in dipilih]

    if not ukuran:
        raise ValidasiError("Pilih minimal satu ukuran.")

    nama_foto = None

    if foto and foto.filename:
        if not foto_diizinkan(foto.filename):
            raise ValidasiError("Format foto harus JPG, JPEG, PNG, atau WEBP.")

        ekstensi = secure_filename(foto.filename).rsplit(".", 1)[1].lower()
        nama_foto = uuid.uuid4().hex + "." + ekstensi

        foto.save(os.path.join(UPLOAD_DIR, nama_foto))

    return {
        "id": uuid.uuid4().hex[:8],
        "nama": nama,
        "harga": harga,
        "kategori": kategori,
        "emoji": emoji,
        "foto": f"/static/uploads/{nama_foto}" if nama_foto else None,
        "ukuran": ukuran,
        "warna": parse_warna(data.get("warna", ""))
    }


def hitung_ringkasan(items):
    """Hitung subtotal, diskon, ongkir, total. Harga selalu diambil dari server."""
    if not isinstance(items, list) or len(items) == 0:
        raise ValidasiError("Keranjang masih kosong.")

    katalog = {p["id"]: p for p in ambil_produk()}
    subtotal = 0
    baris = []
    for no, item in enumerate(items, start=1):
        produk = katalog.get(item.get("id"))
        if produk is None:
            raise ValidasiError(f"Produk di baris {no} sudah tidak tersedia.")
        if item.get("ukuran") not in produk["ukuran"]:
            raise ValidasiError(f"Ukuran {produk['nama']} tidak tersedia.")
        if item.get("warna") not in [w["nama"] for w in produk["warna"]]:
            raise ValidasiError(f"Warna {produk['nama']} tidak tersedia.")
        try:
            qty = int(item.get("qty", 0))
        except (TypeError, ValueError):
            raise ValidasiError(f"Jumlah di baris {no} harus angka.")
        if not 1 <= qty <= 99:
            raise ValidasiError("Jumlah per item harus 1-99.")

        jumlah = produk["harga"] * qty                        # operator aritmatika
        subtotal += jumlah
        baris.append({"nama": produk["nama"], "ukuran": item["ukuran"],
                      "warna": item["warna"], "qty": qty, "jumlah": jumlah})

    diskon = subtotal * DISKON_PERSEN // 100 if subtotal >= DISKON_MIN else 0
    ongkir = 0 if subtotal >= GRATIS_ONGKIR_MIN else ONGKIR
    return {"baris": baris, "subtotal": subtotal, "diskon": diskon,
            "ongkir": ongkir, "total": subtotal - diskon + ongkir}


def validasi_pembeli(data):
    nama = str(data.get("nama", "")).strip()
    telepon = re.sub(r"[\s-]", "", str(data.get("telepon", "")))
    alamat = str(data.get("alamat", "")).strip()
    metode = data.get("metode")

    if len(nama) < 3:
        raise ValidasiError("Nama penerima minimal 3 huruf.")
    elif not re.fullmatch(r"(\+62|62|0)8\d{7,12}", telepon):
        raise ValidasiError("Nomor HP tidak valid. Contoh: 081234567890.")
    elif len(alamat) < 10:
        raise ValidasiError("Alamat terlalu singkat. Tulis jalan, kota, dan kode pos.")
    elif metode not in METODE_BAYAR:
        raise ValidasiError("Pilih metode pembayaran.")
    return nama, telepon, alamat, metode


# ---------------------------------------------------------------- Aplikasi Flask
app = Flask(__name__)


@app.errorhandler(ValidasiError)
def tangani_validasi(err):
    return jsonify({"pesan": str(err)}), 400


@app.get("/")
def beranda():
    konfig = {"ukuran": UKURAN_VALID, "kategori": KATEGORI, "metode": METODE_BAYAR,
              "admin": BOLEH_ADMIN}
    return render_template("index.html", nama=NAMA_BRAND, singkatan=SINGKATAN, konfig=konfig)


@app.get("/api/produk")
def api_produk():
    return jsonify(ambil_produk())


@app.post("/api/produk")
def api_tambah_produk():
    if not BOLEH_ADMIN:
        return jsonify({"pesan": "Fitur admin dimatikan."}), 403

    data = request.form.to_dict()
    data["ukuran"] = request.form.getlist("ukuran")

    produk = validasi_produk(
        data,
        request.files.get("foto")
    )

    daftar = ambil_produk()
    daftar.append(produk)
    simpan_json(PRODUK_FILE, daftar)

    return jsonify(produk), 201


@app.delete("/api/produk/<id_produk>")
def api_hapus_produk(id_produk):
    if not BOLEH_ADMIN:
        return jsonify({"pesan": "Fitur admin dimatikan."}), 403
    daftar = ambil_produk()
    sisa = [p for p in daftar if p["id"] != id_produk]
    if len(sisa) == len(daftar):
        return jsonify({"pesan": "Produk tidak ditemukan."}), 404
    simpan_json(PRODUK_FILE, sisa)
    return jsonify({"ok": True})


@app.post("/api/ringkasan")
def api_ringkasan():
    data = request.get_json(silent=True) or {}
    return jsonify(hitung_ringkasan(data.get("items")))


@app.post("/api/checkout")
def api_checkout():
    data = request.get_json(silent=True) or {}
    nama, telepon, alamat, metode = validasi_pembeli(data)
    ringkasan = hitung_ringkasan(data.get("items"))

    id_pesanan = "FTH-" + datetime.now().strftime("%y%m%d") + "-" + uuid.uuid4().hex[:4].upper()
    pesanan = {"id": id_pesanan, "waktu": datetime.now().isoformat(timespec="seconds"),
               "pembeli": {"nama": nama, "telepon": telepon, "alamat": alamat},
               "metode": METODE_BAYAR[metode], **ringkasan}
    semua = baca_json(PESANAN_FILE, [])
    semua.append(pesanan)
    simpan_json(PESANAN_FILE, semua)

    return jsonify({"id": id_pesanan, "total": ringkasan["total"],
                    "metode": METODE_BAYAR[metode], "instruksi": INSTRUKSI[metode]}), 201


if __name__ == "__main__":
    ambil_produk()  # pastikan data awal terbuat
    app.run(debug=True, port=5000)