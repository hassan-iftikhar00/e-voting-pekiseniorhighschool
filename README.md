# Peki Senior High School E-Voting System

A comprehensive electronic voting system designed specifically for Peki Senior High School to streamline prefectorial elections and ensure a transparent, secure, and efficient voting process.

![Peki Senior High School Logo](https://admissions.pekishs.com/_next/image?url=https%3A%2F%2Fhebbkx1anhila5yf.public.blob.vercel-storage.com%2Fpesco-ypQANIO5MV7swwJQueIYrxVza3zlu1.jpg&w=96&q=75)

## Overview

The Peki Senior High School E-Voting System is a web-based application that automates the entire election process from candidate registration to vote counting and results publication. This system replaces manual ballot casting with a secure digital platform, ensuring accuracy and eliminating human errors in the vote tallying process.

## Key Features

### For Administrators

- **User Management**: Create and manage user accounts with different roles and permissions
- **Election Configuration**: Set up election parameters, voting periods, and system settings
- **Candidate Management**: Register and manage candidate profiles and associated positions
- **Voter Registration**: Import or manually add eligible voters with verification options
- **Results Management**: View, analyze, and publish election results
- **Activity Logging**: Track all system activities for audit and security purposes

### For Voters

- **Secure Authentication**: Login with unique credentials
- **Candidate Information**: View candidate profiles and positions
- **Easy Voting Interface**: Cast votes through an intuitive interface
- **Vote Verification**: Confirm votes before final submission
- **Results Viewing**: Access published results (when enabled by administrators)

## Technical Architecture

- **Frontend**: React.js with TypeScript and TailwindCSS for responsive design
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Role-based access control with granular permissions

## System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Internet Connection**: Stable connection required for voting
- **Devices**: Compatible with desktop computers, laptops, tablets, and smartphones

## Installation & Setup

### Prerequisites

- Node.js (v14+)
- MongoDB (v4+)
- npm or yarn package manager

### Installation Steps

1. Clone the repository

   ```
   git clone https://github.com/peki-shs/e-voting-system.git
   cd e-voting-system
   ```

2. Install dependencies

   ```
   npm install
   # or
   yarn install
   ```

3. Configure environment variables

   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/peki-voting
     JWT_SECRET=your_jwt_secret_key
     NODE_ENV=development
     ```

4. Start the development server

   ```
   npm run dev
   # or
   yarn dev
   ```

5. Access the application
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Usage Guide

### Admin Setup Process

1. **Initial Setup**:

   - Log in with the default admin credentials
   - Change the default password immediately
   - Configure system settings

2. **Pre-Election Setup**:

   - Create positions (e.g., School Prefect, Dining Hall Prefect)
   - Add classes, houses, and academic years
   - Import or add eligible voters
   - Register candidates for each position

3. **Election Management**:
   - Set voting start and end dates/times
   - Activate the election when ready
   - Monitor voting progress in real-time
   - View and publish results after voting ends

### Voter Process

1. **Authentication**: Log in using provided credentials
2. **Voting**: Select candidates for different positions
3. **Confirmation**: Review selections and confirm votes
4. **Completion**: Receive confirmation of successful voting

## Security Measures

- **Data Encryption**: Sensitive information is encrypted
- **Access Control**: Role-based permissions limit access to features
- **Audit Trail**: Complete logging of all system activities
- **Vote Integrity**: Measures to prevent duplicate voting
- **Session Management**: Automatic timeout for inactive sessions

## Support & Feedback

For technical support or to provide feedback, please contact:

- Email: support@pekishs-evoting.edu.gh
- Phone: +233 XX XXX XXXX

## License

© 2023 Peki Senior High School. All rights reserved.
