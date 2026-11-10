import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export type Warna = { nama: string; hex: string };
export type Baris = { nama: string; ukuran: string; warna: string; qty: number; jumlah: number };
export type Pembeli = { nama: string; telepon: string; alamat: string };

export const produk = pgTable("produk", {
  id: text().primaryKey(),
  urutan: serial().notNull(),
  nama: text().notNull(),
  harga: integer().notNull(),
  kategori: text().notNull(),
  emoji: text().notNull().default("👕"),
  foto: text(),
  ukuran: jsonb().$type<string[]>().notNull(),
  warna: jsonb().$type<Warna[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pesanan = pgTable("pesanan", {
  id: text().primaryKey(),
  waktu: timestamp().defaultNow().notNull(),
  pembeli: jsonb().$type<Pembeli>().notNull(),
  metode: text().notNull(),
  baris: jsonb().$type<Baris[]>().notNull(),
  subtotal: integer().notNull(),
  diskon: integer().notNull(),
  ongkir: integer().notNull(),
  total: integer().notNull(),
});
