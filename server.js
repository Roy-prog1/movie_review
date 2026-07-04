const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Koneksi Database PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Inisialisasi Model Embedding (@xenova/transformers)
let pipeline;
async function initEmbeddingModel() {
    const { pipeline: transformersPipeline } = await import('@xenova/transformers');
    // Menggunakan model ringan yang sangat umum untuk text embedding
    pipeline = await transformersPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('🤖 Model Embedding siap digunakan.');
}
initEmbeddingModel();

// Fungsi pembantu untuk generate embedding array dari teks
async function getEmbedding(text) {

    if (!pipeline) {
        throw new Error("Model embedding belum selesai dimuat.");
    }

    const output = await pipeline(text, {
        pooling: "mean",
        normalize: true
    });

    return Array.from(output.data);
}

// ==========================================
// RUMPUN CRUD 1: MANAJEMEN FILM (MOVIES)
// ==========================================

// Create Movie
app.post('/api/movies', async (req, res) => {
    const {
        title,
        genre,
        synopsis,
        release_year,
        poster_url
    } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO movies
            (title, genre, synopsis, release_year, poster_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                title,
                genre,
                synopsis,
                release_year,
                poster_url
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Read All Movies
app.get('/api/movies', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM movies ORDER BY id DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Read Movie By ID
app.get('/api/movies/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM movies WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Film tidak ditemukan'
            });
        }

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

// Update Movie
app.put('/api/movies/:id', async (req, res) => {
    const { id } = req.params;
    const { title, genre, release_year } = req.body;
    try {
        const result = await pool.query(
            'UPDATE movies SET title = $1, genre = $2, release_year = $3 WHERE id = $4 RETURNING *',
            [title, genre, release_year, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Movie
app.delete('/api/movies/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM movies WHERE id = $1', [id]);
        res.json({ message: 'Film berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// RUMPUN CRUD 2: MANAJEMEN REVIEW & VSS
// ==========================================

// Create Review + VSS Integration (Generate & Save Embedding)
app.post('/api/reviews', async (req, res) => {
    const { movie_id, review_text, rating } = req.body;
    // Validasi rating
    if (rating < 1 || rating > 5) {
        return res.status(400).json({
            error: "Rating harus 1-5"
        });
    }
    try {
        // Cek apakah film ada
        const movie = await pool.query(
            "SELECT id FROM movies WHERE id = $1",
            [movie_id]
        );

        if (movie.rows.length === 0) {
            return res.status(404).json({
                error: "Movie tidak ditemukan"
            });
        }
        
        // 1. Generate Vector Embedding dari teks review secara lokal
        const embedding = await getEmbedding(review_text);
        
        // 2. Simpan teks dan array embedding (pgvector otomatis menerima format string '[1,2,3...]')
        const embeddingString = `[${embedding.join(',')}]`;
        
        const result = await pool.query(
            'INSERT INTO reviews (movie_id, review_text, rating, review_embedding) VALUES ($1, $2, $3, $4) RETURNING id, movie_id, review_text, rating',
            [movie_id, review_text, rating, embeddingString]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Read Reviews per Movie
app.get('/api/movies/:id/reviews', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT id, review_text, rating FROM reviews WHERE movie_id = $1', [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Review (Harus generate ulang embedding jika teks berubah)
app.put('/api/reviews/:id', async (req, res) => {
    const { id } = req.params;
    const { review_text, rating } = req.body;
    try {
        const embedding = await getEmbedding(review_text);
        const embeddingString = `[${embedding.join(',')}]`;

        const result = await pool.query(
            'UPDATE reviews SET review_text = $1, rating = $2, review_embedding = $3 WHERE id = $4 RETURNING id, review_text, rating',
            [review_text, rating, embeddingString, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Review
app.delete('/api/reviews/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
        res.json({ message: 'Review berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// 3. FITUR SPESIAL VSS: "REVIEW SERUPA"
// ==========================================
// Read Reviews per Movie
app.get('/api/movies/:id/reviews', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `
            SELECT
                id,
                review_text,
                rating
            FROM reviews
            WHERE movie_id = $1
            ORDER BY created_at DESC
            `,
            [id]
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

// Jalankan Server
app.get("/", (req, res) => {
    res.json({
        status: "Server Running",
        embedding: pipeline ? "Ready" : "Loading"
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});