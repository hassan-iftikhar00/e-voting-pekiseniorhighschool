import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Voter from '../models/Voter.js';
import Election from '../models/Election.js';

dotenv.config();

const createTestData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      username: 'admin',
      password: adminPassword,
      role: 'admin'
    });

    // Create test voter
    const voter = await Voter.create({
      user: admin._id,
      voterId: 'VOTER2025',
      name: 'John Doe',
      hasVoted: false
    });

    // Create test election
    const now = new Date();
    const election = await Election.create({
      title: 'Student Council Election 2025',
      startDate: now,
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true
    });

    console.log('Test data created successfully!');
    console.log('\nAdmin Credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\nVoter ID: VOTER2025');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createTestData();