// Synthetic demo data only. Disclose it in your report and viva.
import 'dotenv/config';
import mongoose from 'mongoose';
import { Report } from './models.js';
const centers = [[19.1197, 72.8464], [19.0186, 72.8424], [19.0544, 72.8402]]; // approximate, arbitrary hotspots
const cats = ['harassment', 'stalking', 'poor_lighting', 'isolated', 'theft', 'unsafe_transport'];
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saferoute');
await Report.deleteMany({ synthetic: true });
const docs = Array.from({ length: 90 }, () => {
  const [la, lo] = centers[Math.floor(Math.random() * centers.length)];
  return { location: { type: 'Point', coordinates: [lo + (Math.random() - .5) * .006, la + (Math.random() - .5) * .006] },
    category: cats[Math.floor(Math.random() * cats.length)], severity: 1 + Math.floor(Math.random() * 3), synthetic: true,
    createdAt: new Date(Date.now() - Math.random() * 60 * 864e5) };
});
await Report.insertMany(docs);
console.log('Seeded ' + docs.length + ' synthetic reports');
await mongoose.disconnect();
