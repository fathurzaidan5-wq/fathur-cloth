FATHURCLOTH - DEPLOYMENT KE RENDER

Project ini memakai Flask/Python. Jangan deploy sebagai Static Site di Netlify.

LANGKAH:
1. Ekstrak ZIP ini.
2. Upload seluruh isi folder ke repository GitHub baru.
   Pastikan app.py, requirements.txt, render.yaml, templates/, static/, dan data/
   berada di root repository (bukan tersimpan di folder bersarang).
3. Buka https://render.com dan login.
4. Pilih New -> Blueprint, lalu hubungkan repository GitHub tersebut.
5. Render akan membaca render.yaml. Jalankan deploy.
6. Setelah selesai, buka URL .onrender.com yang diberikan Render.

CATATAN:
- Deploy ini menjalankan backend Flask melalui Gunicorn.
- File foto/video bawaan yang ada di static/ ikut ter-deploy.
- Pada paket hosting tanpa persistent disk, produk/pesanan/foto yang ditambahkan
  melalui admin dapat hilang saat instance restart atau deploy ulang.
- Admin saat ini belum memakai autentikasi/login. Jangan bagikan situs publik
  sebelum akses admin diamankan.
