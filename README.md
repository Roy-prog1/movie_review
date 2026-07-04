# 🎬 Movie Review

## Deskripsi

Movie Review adalah aplikasi web yang digunakan untuk mengelola data film dan ulasan pengguna. Aplikasi ini dibangun menggunakan **Node.js**, **Express.js**, dan **PostgreSQL** sebagai backend, sedangkan frontend berupa halaman web statis yang disajikan melalui folder `public`.

Selain fitur CRUD data film, aplikasi ini juga memanfaatkan **Transformers (Xenova/all-MiniLM-L6-v2)** untuk menghasilkan **text embedding**, sehingga dapat mendukung proses analisis atau pencarian berdasarkan kemiripan teks.

---

# Teknologi yang Digunakan

- Node.js
- Express.js
- PostgreSQL
- Transformers (`@xenova/transformers`)
- HTML, CSS, JavaScript
- CORS
- dotenv

---

# Cara Menjalankan Aplikasi di Lokal

## 1. Clone Repository

```bash
git clone https://github.com/Roy-prog1/movie_review.git
cd movie_review
```

Atau ekstrak file ZIP yang telah dimiliki.

---

## 2. Install Dependencies

Pastikan Node.js sudah terpasang.

Kemudian jalankan:

```bash
npm install
```

---

## 3. Konfigurasi Database PostgreSQL

Buat database PostgreSQL terlebih dahulu.

Selanjutnya buat file `.env` pada folder utama proyek dengan isi seperti berikut:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/movie_review
PORT=5000
```

Ganti:

- `username`
- `password`
- `movie_review`

sesuai konfigurasi PostgreSQL yang digunakan.

---

## 4. Jalankan Backend

Pada folder project jalankan:

```bash
npm start
```

atau

```bash
node server.js
```

Apabila berhasil, server akan berjalan pada:

```
http://localhost:5000
```

Saat pertama kali dijalankan, aplikasi juga akan mengunduh model embedding **Xenova/all-MiniLM-L6-v2**, sehingga proses startup pertama mungkin membutuhkan waktu lebih lama.

---

## 5. Menjalankan Frontend

Frontend berada di dalam folder:

```
public/
```

Karena Express menggunakan:

```javascript
app.use(express.static('public'));
```

maka frontend akan otomatis dijalankan bersamaan dengan backend.

Buka browser dan akses:

```
http://localhost:5000
```

Tidak diperlukan menjalankan server frontend secara terpisah.

---

# Struktur Folder

```
movie_review/
│
├── public/             # Frontend
├── server.js           # Backend Express
├── package.json
├── package-lock.json
├── .env
└── node_modules/
```

---

# Menjalankan Aplikasi

1. Pastikan PostgreSQL aktif.
2. Pastikan file `.env` telah dikonfigurasi.
3. Jalankan:

```bash
npm start
```

4. Buka browser:

```
http://localhost:5000
```

Aplikasi siap digunakan.
