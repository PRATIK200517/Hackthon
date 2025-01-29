const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

// MySQL Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Use your MySQL username
  password: '3qL!8xVr^A1z7P@d', // Use your MySQL password
  database: 'mindhaven'
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('DB connection error:', err);
  } else {
    console.log('Connected to MySQL');
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'src'))); // Serve static files from the 'src' folder

// Set up session management
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Sign-up route
app.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into the database
    const query = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
    db.query(query, [username, hashedPassword, email], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(200).json({ message: 'User registered successfully' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error hashing the password' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Query the database for the user
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Store user session
      req.session.userId = user.id;
      req.session.username = user.username;

      res.status(200).json({ message: 'Login successful', user: { id: user.id, username: user.username } });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Route to check if the user is logged in
app.get('/logged-in', (req, res) => {
  if (req.session.userId) {
    return res.status(200).json({ loggedIn: true, username: req.session.username });
  }
  res.status(200).json({ loggedIn: false });
});

// Route to log out
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

// Serve the index page after successful login
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
  } else {
    res.redirect('/login.html'); // Redirect to login page if not logged in
  }
});

// Route to log out
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});
// Add mood entry
app.post('/add-mood', (req, res) => {
  const { mood, feedback } = req.body;

  // Check if the user is logged in
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in to track your mood' });
  }

  if (!mood) {
    return res.status(400).json({ error: 'Mood is required' });
  }

  const userId = req.session.userId;
  const query = 'INSERT INTO mood_tracker (user_id, mood, feedback) VALUES (?, ?, ?)';
  
  db.query(query, [userId, mood, feedback], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error adding mood entry' });
    }
    res.status(200).json({ message: 'Mood saved successfully' });
  });
});

// Get mood history for the logged-in user
app.get('/mood-history', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in to view mood history' });
  }

  const userId = req.session.userId;
  const query = 'SELECT * FROM mood_tracker WHERE user_id = ? ORDER BY timestamp DESC';

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching mood history' });
    }

    res.status(200).json(results);
  });
});

// Route to add sleep entry
app.post('/add-sleep', (req, res) => {
  const { hours, feedback } = req.body;

  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in to track your sleep' });
  }

  if (!hours) {
    return res.status(400).json({ error: 'Sleep hours are required' });
  }

  const userId = req.session.userId;
  const query = 'INSERT INTO sleep_tracker (user_id, hours, feedback) VALUES (?, ?, ?)';
  
  db.query(query, [userId, hours, feedback], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error adding sleep entry' });
    }
    res.status(200).json({ message: 'Sleep saved successfully' });
  });
});

// Route to get sleep history
app.get('/sleep-history', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in to view sleep history' });
  }

  const userId = req.session.userId;
  const query = 'SELECT * FROM sleep_tracker WHERE user_id = ? ORDER BY timestamp DESC';

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching sleep history' });
    }

    res.status(200).json(results);
  });
});

// Route to interact with the Gemini API (Example for AI integration)
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Send request to Gemini API with the user message
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: userMessage }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Check if the candidates array and content exist
    if (response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content) {
      const content = response.data.candidates[0].content;

      // Extract text from parts[0].text
      if (content.parts && content.parts[0] && content.parts[0].text) {
        const aiResponse = content.parts[0].text;
        res.json({ response: aiResponse });
      } else {
        res.status(500).json({ error: 'No text found in parts' });
      }
    } else {
      res.status(500).json({ error: 'Unexpected response format from Gemini API' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interacting with Gemini API' });
  }
});


// Function to get geolocation (latitude and longitude) based on a place name
async function getCoordinatesFromPlaceName(place) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${place}`;

  try {
    const response = await axios.get(url);
    if (response.data.length > 0) {
      const location = response.data[0];
      return {
        lat: location.lat,
        lon: location.lon,
        formattedAddress: location.display_name
      };
    } else {
      throw new Error('Location not found');
    }
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return { error: 'Error fetching coordinates' };
  }
}

// Function to get nearby resources based on latitude and longitude
async function getNearbyResources(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

  try {
    const response = await axios.get(url);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return { error: 'Error fetching data from Nominatim API' };
  }
}

app.get('/search', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (!lat || !lon) {
    console.log('Missing latitude or longitude');
    return res.status(400).json({ error: 'Latitude and longitude are required.' });
  }

  console.log(`Received lat: ${lat}, lon: ${lon}`);

  try {
    // Get nearby resources based on the coordinates
    const nearbyData = await getNearbyResources(lat, lon);

    if (nearbyData.error) {
      return res.status(404).json({ error: nearbyData.error });
    }

    res.json({
      formattedAddress: nearbyData.display_name || 'Address not found',
      nearbyData: [{
        lat: nearbyData.lat,
        lon: nearbyData.lon,
        name: 'Nearby Clinic'  // Placeholder name, modify as per your resource data
      }]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error fetching location or nearby resources' });
  }
});
// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
