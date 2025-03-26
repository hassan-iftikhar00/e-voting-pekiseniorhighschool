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

## Licensing

© 2025 Hassan Iftikhar. All rights reserved.

This software is proprietary and confidential. No part of this software may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the owner.

**IMPORTANT**: This software has no open-source components and is not available for use, modification, or distribution under any circumstances without explicit written permission from the owner. All rights are exclusively reserved.

See the [LICENSE.md](./LICENSE.md) file for complete licensing details.

## Contact

For any inquiries or support, please contact:

- Email: hassaniftikhardev@gmail.com
