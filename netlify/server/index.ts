/**
 * FathurCloth (FTH) - backend untuk Netlify.
 * Versi JavaScript dari FathurCloth-Render-Deploy/app.py dengan aturan validasi yang sama.
 * Produk & pesanan disimpan di Netlify Database, foto produk di Netlify Blobs.
 */
import { Hono } from "hono";
import { getStore } from "@netlify/blobs";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { produk, pesanan, type Warna } from "../../db/schema.ts";

export const config = { path: "/api/*" };

const ONGKIR = 15000;
const GRATIS_ONGKIR_MIN = 500000;
const DISKON_MIN = 1000000;
const DISKON_PERSEN = 10;
const BOLEH_ADMIN = true;

const UKURAN_VALID = ["S", "M", "L", "XL", "XXL"];
const KATEGORI = ["Atasan", "Bawahan", "Luaran", "Aksesoris"];
const METODE_BAYAR: Record<string, string> = {
  transfer: "Transfer Bank",
  qris: "QRIS",
  ewallet: "E-Wallet",
  cod: "Bayar di Tempat",
};
const INSTRUKSI: Record<string, string> = {
  transfer: "Transfer ke BCA 123-456-7890 a.n. FathurCloth, maksimal 24 jam.",
  qris: "Kode QRIS akan dikirim ke nomor WhatsApp Anda.",
  ewallet: "Tautan pembayaran DANA/OVO dikirim ke nomor WhatsApp Anda.",
  cod: "Siapkan uang pas saat kurir tiba.",
};
const TIPE_FOTO: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const MAKS_FOTO = 5 * 1024 * 1024;

const fotoStore = () => getStore({ name: "foto-produk", consistency: "strong" });

class ValidasiError extends Error {}

const hex = (n: number) => crypto.randomUUID().replace(/-/g, "").slice(0, n);
const judul = (s: string) => s.toLowerCase().replace(/(^|[^a-zA-Z])([a-z])/g, (_, a, b) => a + b.toUpperCase());

function parseWarna(teks: unknown): Warna[] {
  const hasil: Warna[] = [];
  for (let bagian of String(teks ?? "").split(",")) {
    bagian = bagian.trim();
    if (!bagian) continue;
    if (!bagian.includes("=")) throw new ValidasiError(`Format warna '${bagian}' salah. Contoh: Hitam=#111111`);
    const i = bagian.indexOf("=");
    const nama = bagian.slice(0, i).trim();
    const kode = bagian.slice(i + 1).trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(kode)) throw new ValidasiError(`Kode warna '${kode}' harus berbentuk #RRGGBB.`);
    if (nama.length < 2) throw new ValidasiError("Nama warna minimal 2 huruf.");
    hasil.push({ nama: judul(nama), hex: kode.toLowerCase() });
  }
  if (!hasil.length) throw new ValidasiError("Isi minimal satu warna.");
  return hasil;
}

async function validasiProduk(form: FormData) {
  const nama = String(form.get("nama") ?? "").trim();
  if (nama.length < 2 || nama.length > 40) throw new ValidasiError("Nama produk harus 2-40 karakter.");

  const hargaTeks = String(form.get("harga") ?? "").trim();
  if (!/^-?\d+$/.test(hargaTeks)) throw new ValidasiError("Harga harus berupa angka.");
  const harga = Number(hargaTeks);
  if (harga < 1000 || harga > 10_000_000) throw new ValidasiError("Harga harus antara Rp1.000 dan Rp10.000.000.");

  const kategori = String(form.get("kategori") ?? "");
  if (!KATEGORI.includes(kategori)) throw new ValidasiError("Pilih kategori yang tersedia.");

  const emoji = String(form.get("emoji") ?? "").trim() || "👕";
  if ([...emoji].length > 4) throw new ValidasiError("Ikon cukup satu emoji.");

  const dipilih = form.getAll("ukuran").map(String);
  const ukuran = UKURAN_VALID.filter((u) => dipilih.includes(u));
  if (!ukuran.length) throw new ValidasiError("Pilih minimal satu ukuran.");

  const warna = parseWarna(form.get("warna"));

  let fotoFile: File | null = null;
  let ekstensi = "";
  const f = form.get("foto");
  if (f instanceof File && f.name && f.size > 0) {
    ekstensi = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "";
    if (!TIPE_FOTO[ekstensi]) throw new ValidasiError("Format foto harus JPG, JPEG, PNG, atau WEBP.");
    if (f.size > MAKS_FOTO) throw new ValidasiError("Ukuran foto maksimal 5 MB.");
    fotoFile = f;
  }

  return { nama, harga, kategori, emoji, ukuran, warna, fotoFile, ekstensi };
}

async function hitungRingkasan(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) throw new ValidasiError("Keranjang masih kosong.");

  const katalog = new Map((await db.select().from(produk)).map((p) => [p.id, p]));
  let subtotal = 0;
  const baris = [];
  for (const [i, item] of items.entries()) {
    const no = i + 1;
    const p = katalog.get(item?.id);
    if (!p) throw new ValidasiError(`Produk di baris ${no} sudah tidak tersedia.`);
    if (!p.ukuran.includes(item.ukuran)) throw new ValidasiError(`Ukuran ${p.nama} tidak tersedia.`);
    if (!p.warna.some((w) => w.nama === item.warna)) throw new ValidasiError(`Warna ${p.nama} tidak tersedia.`);
    const qty = Number(item.qty ?? 0);
    if (!Number.isInteger(qty)) throw new ValidasiError(`Jumlah di baris ${no} harus angka.`);
    if (qty < 1 || qty > 99) throw new ValidasiError("Jumlah per item harus 1-99.");

    const jumlah = p.harga * qty;
    subtotal += jumlah;
    baris.push({ nama: p.nama, ukuran: item.ukuran, warna: item.warna, qty, jumlah });
  }

  const diskon = subtotal >= DISKON_MIN ? Math.floor((subtotal * DISKON_PERSEN) / 100) : 0;
  const ongkir = subtotal >= GRATIS_ONGKIR_MIN ? 0 : ONGKIR;
  return { baris, subtotal, diskon, ongkir, total: subtotal - diskon + ongkir };
}

function validasiPembeli(data: any) {
  const nama = String(data?.nama ?? "").trim();
  const telepon = String(data?.telepon ?? "").replace(/[\s-]/g, "");
  const alamat = String(data?.alamat ?? "").trim();
  const metode = String(data?.metode ?? "");

  if (nama.length < 3) throw new ValidasiError("Nama penerima minimal 3 huruf.");
  if (!/^(\+62|62|0)8\d{7,12}$/.test(telepon)) throw new ValidasiError("Nomor HP tidak valid. Contoh: 081234567890.");
  if (alamat.length < 10) throw new ValidasiError("Alamat terlalu singkat. Tulis jalan, kota, dan kode pos.");
  if (!(metode in METODE_BAYAR)) throw new ValidasiError("Pilih metode pembayaran.");
  return { nama, telepon, alamat, metode };
}

const tampil = (p: typeof produk.$inferSelect) => ({
  id: p.id,
  nama: p.nama,
  harga: p.harga,
  kategori: p.kategori,
  emoji: p.emoji,
  foto: p.foto,
  ukuran: p.ukuran,
  warna: p.warna,
});

const app = new Hono();

app.onError((err, c) => {
  if (err instanceof ValidasiError) return c.json({ pesan: err.message }, 400);
  console.error(err);
  return c.json({ pesan: "Terjadi kesalahan di server. Coba lagi." }, 500);
});

app.get("/api/produk", async (c) => {
  const daftar = await db.select().from(produk).orderBy(asc(produk.urutan));
  return c.json(daftar.map(tampil));
});

app.post("/api/produk", async (c) => {
  if (!BOLEH_ADMIN) return c.json({ pesan: "Fitur admin dimatikan." }, 403);

  const form = await c.req.raw.formData().catch(() => {
    throw new ValidasiError("Data formulir tidak terbaca.");
  });
  const v = await validasiProduk(form);

  let foto: string | null = null;
  if (v.fotoFile) {
    const kunci = `${crypto.randomUUID().replace(/-/g, "")}.${v.ekstensi}`;
    await fotoStore().set(kunci, await v.fotoFile.arrayBuffer(), {
      metadata: { tipe: TIPE_FOTO[v.ekstensi] },
    });
    foto = `/api/foto/${kunci}`;
  }

  const [baru] = await db
    .insert(produk)
    .values({
      id: hex(8),
      nama: v.nama,
      harga: v.harga,
      kategori: v.kategori,
      emoji: v.emoji,
      foto,
      ukuran: v.ukuran,
      warna: v.warna,
    })
    .returning();
  return c.json(tampil(baru), 201);
});

app.delete("/api/produk/:id", async (c) => {
  if (!BOLEH_ADMIN) return c.json({ pesan: "Fitur admin dimatikan." }, 403);
  const [hapus] = await db.delete(produk).where(eq(produk.id, c.req.param("id"))).returning();
  if (!hapus) return c.json({ pesan: "Produk tidak ditemukan." }, 404);
  if (hapus.foto?.startsWith("/api/foto/")) {
    await fotoStore().delete(hapus.foto.slice("/api/foto/".length)).catch(() => {});
  }
  return c.json({ ok: true });
});

app.get("/api/foto/:kunci", async (c) => {
  const hasil = await fotoStore().getWithMetadata(c.req.param("kunci"), { type: "arrayBuffer" });
  if (!hasil) return c.json({ pesan: "Foto tidak ditemukan." }, 404);
  const tipe = String(hasil.metadata?.tipe ?? "application/octet-stream");
  return new Response(hasil.data, {
    headers: {
      "Content-Type": tipe,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

app.post("/api/ringkasan", async (c) => {
  const data = await c.req.json().catch(() => ({}));
  return c.json(await hitungRingkasan(data?.items));
});

app.post("/api/checkout", async (c) => {
  const data = await c.req.json().catch(() => ({}));
  const { nama, telepon, alamat, metode } = validasiPembeli(data);
  const ringkasan = await hitungRingkasan(data?.items);

  const tanggal = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
  const id = `FTH-${tanggal}-${hex(4).toUpperCase()}`;

  await db.insert(pesanan).values({
    id,
    pembeli: { nama, telepon, alamat },
    metode: METODE_BAYAR[metode],
    ...ringkasan,
  });

  return c.json(
    { id, total: ringkasan.total, metode: METODE_BAYAR[metode], instruksi: INSTRUKSI[metode] },
    201,
  );
});

app.all("/api/*", (c) => c.json({ pesan: "Alamat API tidak ditemukan." }, 404));

export default app;
