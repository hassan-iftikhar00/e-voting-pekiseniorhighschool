import mongoose from "mongoose";
import dotenv from "dotenv";
import Position from "../server/models/Position.js";
import Candidate from "../server/models/Candidate.js";

dotenv.config();

const createTestData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      "mongodb+srv://peki:peki@cluster0.acwwe.mongodb.net/",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    // Create a dummy electionId
    const dummyElectionId = new mongoose.Types.ObjectId();

    // Create initial positions
    const positions = [
      {
        title: "President",
        priority: 1,
        isActive: true,
        electionId: dummyElectionId,
      },
      {
        title: "Vice President",
        priority: 2,
        isActive: true,
        electionId: dummyElectionId,
      },
      {
        title: "Secretary",
        priority: 3,
        isActive: true,
        electionId: dummyElectionId,
      },
      {
        title: "Treasurer",
        priority: 4,
        isActive: true,
        electionId: dummyElectionId,
      },
    ];

    const createdPositions = await Promise.all(
      positions.map((position) => Position.create(position))
    );

    console.log(`Created ${createdPositions.length} positions`);

    // Create candidates for the positions
    const candidates = [
      {
        name: "Alice Johnson",
        positionId: createdPositions[0]._id,
        isActive: true,
      },
      {
        name: "Bob Smith",
        positionId: createdPositions[0]._id,
        isActive: true,
      },
      {
        name: "Charlie Brown",
        positionId: createdPositions[1]._id,
        isActive: true,
      },
      {
        name: "Diana Prince",
        positionId: createdPositions[2]._id,
        isActive: true,
      },
      {
        name: "Ethan Hunt",
        positionId: createdPositions[3]._id,
        isActive: true,
      },
    ];

    await Promise.all(
      candidates.map((candidate) => Candidate.create(candidate))
    );

    console.log(`Created ${candidates.length} candidates`);

    console.log("Test data created successfully!");
  } catch (error) {
    console.error("Error creating test data:", error);
  } finally {
    await mongoose.disconnect();
  }
};

createTestData();
