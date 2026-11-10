-- Katalog awal FathurCloth (dari data/produk.json)
INSERT INTO "produk" ("id", "nama", "harga", "kategori", "emoji", "foto", "ukuran", "warna") VALUES
  ('3ef8c460', 'BOXY T-SHIRT CHMB WHITE', 799000, 'Atasan', '👕', '/static/uploads/053afad0afed499b90ce18100142ce23.jpg', '["S", "M", "L", "XL"]'::jsonb, '[{"nama": "Putih", "hex": "#f1f1ec"}]'::jsonb),
  ('740dc43e', 'BOXY T-SHIRT CHMB STAR LOGO', 899000, 'Atasan', '👕', '/static/uploads/7178f5e058114f1c99b8c60e7541999b.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb),
  ('d9ae7621', 'BOXY T-SHIRT CALLE X SNSB', 1000000, 'Atasan', '👕', '/static/uploads/48e28c8b4bd04e6ba491d4ef1b3c12d6.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb),
  ('7585254f', 'HOODIE CALLE X SNSB BOXY', 1890000, 'Atasan', '👕', '/static/uploads/450665348e4c415ba9cd7f4032e61584.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb),
  ('bb3669d8', 'HOODIE CALLE X SNSB BOXY FIT', 1999000, 'Atasan', '👕', '/static/uploads/230e7358506b49e59d0b0e1fc23693dc.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb),
  ('d916cdb0', 'HOODIE CALLE BASIC BLACK', 1799000, 'Atasan', '👕', '/static/uploads/dc69fdfa7ffc4030bc11ddcf9d4abe74.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb),
  ('cb8843f3', 'ZIPPER CALLE GREY', 2100000, 'Atasan', '👕', '/static/uploads/62cdf88a4b1b4ba9aa84d1c5bd18456f.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Putih", "hex": "#f1f1ec"}]'::jsonb),
  ('9865b266', 'ZIPPER CALLE BLUE BOXY FIT', 2100000, 'Atasan', '👕', '/static/uploads/c2ca093a545043bbb18ed2c87ef168c8.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Putih", "hex": "#f1f1ec"}]'::jsonb),
  ('8c0bb315', 'PREFACE BOXY BLACK', 2300000, 'Atasan', '👕', '/static/uploads/b40f8a0a8b5d4713b1f08c241f18048d.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb),
  ('5ecc3c02', 'HOODIE CHMB V2 BOXY FIT', 800000, 'Atasan', '👕', '/static/uploads/4c8f329981f4461782ec0add226279b3.jpeg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb),
  ('e0f61ae1', 'HOODIE CHMB BOXY FIT', 899000, 'Atasan', '👕', '/static/uploads/c19ec9781e0e464daca63dc127f9ff63.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}, {"nama": "Putih", "hex": "#f1f1ec"}]'::jsonb),
  ('804435ee', 'SHORTPANTS CHMB', 399000, 'Bawahan', '👕', '/static/uploads/ae2b56b0c417477ba57317f934719022.jpg', '["S", "M", "L"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb),
  ('140a8611', 'SWEATPANTS CALLE', 699000, 'Bawahan', '👕', '/static/uploads/fcddb440d24e4ef994164461488d4d20.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb),
  ('8c63d573', 'DENIM CALLE', 1599000, 'Luaran', '👕', '/static/uploads/1d9b3ba2202646ec9d6b946bb4d40cc0.jpg', '["M", "L", "XL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb),
  ('f513ad24', 'WINGMAN DENIM', 4999000, 'Atasan', '👕', '/static/uploads/dfda76647c42454c8cc99661e36768fa.jpg', '["M", "L", "XL", "XXL"]'::jsonb, '[{"nama": "Hitam", "hex": "#1b1f24"}]'::jsonb)
ON CONFLICT ("id") DO NOTHING;
