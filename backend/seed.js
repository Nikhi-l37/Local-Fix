const mongoose = require('mongoose');
const Worker = require('./models/Worker');
require('dotenv').config();

// Hyderabad Center Coordinates approximately (Longitude, Latitude)
const centerLng = 78.4867;
const centerLat = 17.3850;

const workers = [
  {
    name: "Ramesh (Plumber)",
    category: "Plumber",
    phone: "+91 9876543210",
    rating: 4.8,
    location: { type: "Point", coordinates: [centerLng + 0.01, centerLat + 0.01] } // ~1-2km away
  },
  {
    name: "Suresh (Electrician)",
    category: "Electrician",
    phone: "+91 9876543211",
    rating: 4.6,
    location: { type: "Point", coordinates: [centerLng - 0.02, centerLat - 0.01] } // ~2-3km away
  },
  {
    name: "Mahesh (Carpenter)",
    category: "Carpenter",
    phone: "+91 9876543212",
    rating: 4.9,
    location: { type: "Point", coordinates: [centerLng + 0.005, centerLat - 0.005] } // ~1km away
  },
  {
    name: "Rajesh (AC Repair)",
    category: "AC Mechanic",
    phone: "+91 9876543213",
    rating: 4.5,
    location: { type: "Point", coordinates: [centerLng - 0.03, centerLat + 0.02] } 
  }
];

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await Worker.deleteMany({});
    await Worker.insertMany(workers);
    console.log('Dummy workers seeded');
    mongoose.connection.close();
  })
  .catch(err => console.error(err));
