const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir)); // serve uploaded images

// Multer config to store files locally in "uploads" folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.emeucb3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const database = client.db("bookServer");
    const booksCollection = database.collection("books");

    // Home route


    
    app.get('/', (req, res) => {
      res.send('The library is ready for readers');
    });

    // GET all books
    app.get('/books', async (req, res) => {
      try {
        const books = await booksCollection.find().toArray();
        res.json(books);
      } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).json({ message: 'Failed to fetch books' });
      }
    });

    // POST new book (with image upload)
    app.post('/books', upload.single('image'), async (req, res) => {
      try {
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);

        const { name, quantity, author, category, description, rating } = req.body;

        if (!name || !quantity || !author || !category || !description || !rating) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        const newBook = {
          name,
          quantity: parseInt(quantity, 10),
          author,
          category,
          description,
          rating: parseFloat(rating),
          imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
          createdAt: new Date(),
        };

        const result = await booksCollection.insertOne(newBook);
        res.status(201).json({ message: '✅ Book added successfully', bookId: result.insertedId });
      } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).json({ message: '❌ Failed to add book', error: err.message });
      }
    });

    app.listen(port, () => {
      console.log(`📚 Library server is running on port: ${port}`);
    });

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
}

run();
