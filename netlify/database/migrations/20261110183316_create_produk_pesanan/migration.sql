CREATE TABLE "pesanan" (
	"id" text PRIMARY KEY,
	"waktu" timestamp DEFAULT now() NOT NULL,
	"pembeli" jsonb NOT NULL,
	"metode" text NOT NULL,
	"baris" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"diskon" integer NOT NULL,
	"ongkir" integer NOT NULL,
	"total" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produk" (
	"id" text PRIMARY KEY,
	"urutan" serial,
	"nama" text NOT NULL,
	"harga" integer NOT NULL,
	"kategori" text NOT NULL,
	"emoji" text DEFAULT '👕' NOT NULL,
	"foto" text,
	"ukuran" jsonb NOT NULL,
	"warna" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
