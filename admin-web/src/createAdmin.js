// Firebase Admin Setup Script
// Run this in Firebase Console → Firestore → Query tab or use Firebase CLI

import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Function to create an admin user
export const createAdminUser = async (userId, userData) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      role: 'admin', // or 'super_admin'
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Function to update existing user to admin
export const makeUserAdmin = async (userId, role = 'admin') => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      role: role, // 'admin' or 'super_admin'
      status: 'active',
      updatedAt: new Date()
    });
    console.log(`User ${userId} is now an ${role}`);
  } catch (error) {
    console.error('Error updating user role:', error);
  }
};

// Example usage:
// createAdminUser('user-id-here', {
//   name: 'Admin Name',
//   email: 'admin@school.edu',
//   studentId: 'ADMIN001'
// });
