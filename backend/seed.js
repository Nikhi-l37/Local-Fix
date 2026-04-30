const mongoose = require('mongoose');
const Worker = require('./models/Worker');
require('dotenv').config();

// Hyderabad center coordinates (Longitude, Latitude)
const centerLng = 78.4867;
const centerLat = 17.3850;

// Seed from the prototype category set, but persisted using the new Worker schema.
const workersBase = [
  { name: 'Ramesh Kumar', category: 'Plumber', phone: '+91 9876543210', rating: 4.8, totalRatings: 47, jobsDone: 120, lat: centerLat + 0.008, lng: centerLng + 0.006, available: true },
  { name: 'Venkat Reddy', category: 'Plumber', phone: '+91 9876543220', rating: 4.3, totalRatings: 23, jobsDone: 65, lat: centerLat - 0.012, lng: centerLng + 0.009, available: true },

  { name: 'Suresh Babu', category: 'Electrician', phone: '+91 9876543211', rating: 4.6, totalRatings: 38, jobsDone: 95, lat: centerLat - 0.01, lng: centerLng - 0.015, available: true },
  { name: 'Praveen Kumar', category: 'Electrician', phone: '+91 9876543221', rating: 4.9, totalRatings: 62, jobsDone: 150, lat: centerLat + 0.005, lng: centerLng - 0.008, available: true },

  { name: 'Mahesh Yadav', category: 'Carpenter', phone: '+91 9876543212', rating: 4.9, totalRatings: 55, jobsDone: 130, lat: centerLat - 0.005, lng: centerLng + 0.005, available: true },
  { name: 'Raju Sharma', category: 'Carpenter', phone: '+91 9876543222', rating: 4.4, totalRatings: 18, jobsDone: 42, lat: centerLat + 0.015, lng: centerLng - 0.01, available: true },

  { name: 'Rajesh Gupta', category: 'AC Mechanic', phone: '+91 9876543213', rating: 4.5, totalRatings: 30, jobsDone: 88, lat: centerLat + 0.02, lng: centerLng - 0.02, available: true },

  { name: 'Anil Verma', category: 'Painter', phone: '+91 9876543214', rating: 4.7, totalRatings: 41, jobsDone: 110, lat: centerLat + 0.003, lng: centerLng + 0.012, available: true },
  { name: 'Srinivas Rao', category: 'Painter', phone: '+91 9876543224', rating: 4.2, totalRatings: 15, jobsDone: 35, lat: centerLat - 0.008, lng: centerLng - 0.005, available: true },

  { name: 'Lakshmi Devi', category: 'Cleaner', phone: '+91 9876543215', rating: 4.8, totalRatings: 50, jobsDone: 200, lat: centerLat - 0.003, lng: centerLng - 0.007, available: true },

  { name: 'Narasimha Rao', category: 'JCB Operator', phone: '+91 9876543216', rating: 4.6, totalRatings: 28, jobsDone: 75, lat: centerLat + 0.018, lng: centerLng + 0.015, available: true },
  { name: 'Balaji Reddy', category: 'JCB Operator', phone: '+91 9876543226', rating: 4.4, totalRatings: 20, jobsDone: 50, lat: centerLat - 0.02, lng: centerLng + 0.018, available: true },

  { name: 'Mohan Das', category: 'Mason', phone: '+91 9876543217', rating: 4.5, totalRatings: 35, jobsDone: 90, lat: centerLat + 0.007, lng: centerLng - 0.012, available: true },
  { name: 'Shankar Rao', category: 'Mason', phone: '+91 9876543227', rating: 4.7, totalRatings: 42, jobsDone: 105, lat: centerLat - 0.015, lng: centerLng + 0.003, available: true },

  { name: 'Prabhakar Singh', category: 'Welder', phone: '+91 9876543218', rating: 4.3, totalRatings: 19, jobsDone: 48, lat: centerLat + 0.01, lng: centerLng + 0.018, available: true },

  { name: 'Kishan Lal', category: 'Pest Control', phone: '+91 9876543219', rating: 4.8, totalRatings: 45, jobsDone: 160, lat: centerLat - 0.006, lng: centerLng + 0.014, available: true },

  { name: 'Ranga Reddy', category: 'Tractor Operator', phone: '+91 9876543230', rating: 4.5, totalRatings: 22, jobsDone: 60, lat: centerLat + 0.012, lng: centerLng + 0.008, available: true },

  { name: 'Satish Kumar', category: 'Appliance Repair', phone: '+91 9876543231', rating: 4.6, totalRatings: 33, jobsDone: 85, lat: centerLat - 0.004, lng: centerLng - 0.01, available: true },

  { name: 'Yellaiah', category: 'Gardener', phone: '+91 9876543232', rating: 4.4, totalRatings: 16, jobsDone: 40, lat: centerLat + 0.009, lng: centerLng - 0.004, available: true },

  { name: 'Farhan Khan', category: 'Auto Mechanic', phone: '+91 9876543233', rating: 4.7, totalRatings: 39, jobsDone: 100, lat: centerLat - 0.007, lng: centerLng + 0.011, available: true },
];

const workers = workersBase.map((w) => {
  // Derive Aadhaar last-4 from phone digits for mock data.
  const last4 = (w.phone.replace(/\D/g, '')).slice(-4);
  return {
    name: w.name,
    phone: w.phone,
    aadhaarLast4: last4 || '****',
    skills: [w.category],
    location: {
      type: 'Point',
      coordinates: [w.lng, w.lat], // [longitude, latitude]
    },
    availability: w.available ?? true,
    rating: {
      average: w.rating ?? 0,
      count: w.totalRatings ?? 0,
    },
    jobsDone: w.jobsDone ?? 0,
    isVerified: true,
  };
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await Worker.deleteMany({});
    await Worker.insertMany(workers);
    console.log(`Seeded ${workers.length} workers`);
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error('Seeding error:', err.message);
    mongoose.connection.close().catch(() => {});
  });
