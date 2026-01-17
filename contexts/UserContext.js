import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import SafeAsyncStorage from '../utils/SafeAsyncStorage';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  onIdTokenChanged,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

// Network status will be handled through error handling
const UserContext = createContext();

/**
 * UserProvider manages the authentication state and user data
 * Provides user context to the entire app
 */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const isMounted = useRef(true);

  // Set up auth state listener with retry logic
  useEffect(() => {
    let isEffectMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout;

    const setupAuthListener = () => {
      let unsubscribe = () => {}; // Default empty cleanup function
      let isSubscribed = true;
      let cleanupRetryTimeout = null;
      let retryCount = 0;
      const maxRetries = 5;

      const cleanup = () => {
        isEffectMounted = false;
        isSubscribed = false;
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
        if (cleanupRetryTimeout) {
          clearTimeout(cleanupRetryTimeout);
        }
      };

      const execute = async () => {
        if (!isEffectMounted || !isSubscribed) return;

        try {
          // Set loading to true when starting to check auth state
          if (isEffectMounted) {
            setLoading(true);
          }
          // Try to load cached data first for better UX
          try {
            const cachedUser = await SafeAsyncStorage.getItem('userData');
            if (cachedUser) {
              console.log('Using cached user data');
              setUser(JSON.parse(cachedUser));
            }
          } catch (error) {
            console.warn('Failed to load cached user data:', error);
          }

          // Set up the auth state listener
          unsubscribe = onAuthStateChanged(
            auth,
            // Success callback
            async (firebaseUser) => {
              if (!isEffectMounted) return;

              try {
                // Loading state is now set at the beginning of execute()

                if (firebaseUser) {
                  console.log('User authenticated:', firebaseUser.uid);

                  // Try to get user data from Firestore
                  let additionalUserData = {};
                  let userDoc;

                  try {
                    // First try to get by UID (recommended)
                    userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    console.log('Firestore document data:', userDoc.exists() ? userDoc.data() : 'No document found');

                    if (userDoc.exists()) {
                      additionalUserData = userDoc.data();
                      console.log('Found user data by UID:', additionalUserData);
                    } else {
                      // Fallback: Try to get by email (for backward compatibility)
                      console.log('No user data found by UID, trying email...');
                      const usersRef = collection(db, 'users');
                      const q = query(usersRef, where('email', '==', firebaseUser.email));
                      const querySnapshot = await getDocs(q);

                      if (!querySnapshot.empty) {
                        additionalUserData = querySnapshot.docs[0].data();
                        console.log('Found user data by email:', additionalUserData);
                      }
                    }
                  } catch (dbError) {
                    console.warn('Database error, using available data:', dbError.message);
                    // Continue with available data
                  }

                  // Create user data object with fallbacks
                  const userData = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    emailVerified: firebaseUser.emailVerified,
                    name: additionalUserData?.name ||
                          firebaseUser.displayName ||
                          firebaseUser.email?.split('@')[0] ||
                          'User',
                    profilePic: additionalUserData?.profilePic ||
                               firebaseUser.photoURL ||
                               null,
                    username: additionalUserData?.username ||
                             firebaseUser.email?.split('@')[0] ||
                             'user',
                    // Include all possible fields from Firestore
                    ...additionalUserData,  // This will include all fields from Firestore
                    // Set defaults for required fields if they don't exist
                    studentID: additionalUserData?.studentID || additionalUserData?.studentId || '',
                    mobile: additionalUserData?.mobile || additionalUserData?.phone || '',
                    address: additionalUserData?.address || '',
                    bio: additionalUserData?.bio || '',
                    birthday: additionalUserData?.birthday || '',
                    school: additionalUserData?.school || '',
                    role: additionalUserData?.role || 'student',
                    createdAt: additionalUserData?.createdAt || serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  };
                  
                  console.log('Final user data being set:', JSON.stringify(userData, null, 2));

                  // Update state
                  setUser(userData);

                  // Cache user data
                  try {
                    await SafeAsyncStorage.setItem('userData', JSON.stringify(userData));
                  } catch (storageError) {
                    console.warn('Failed to cache user data:', storageError.message);
                  }

                  // Update last login time (don't block on this)
                  if (userDoc?.exists()) {
                    updateDoc(doc(db, 'users', firebaseUser.uid), {
                      lastLogin: serverTimestamp(),
                    }).catch((e) => console.warn('Failed to update last login:', e.message));
                  }

                  console.log('User data loaded successfully');
                  retryCount = 0; // Reset retry count on success
                } else {
                  console.log('No user signed in');
                  setUser(null);
                  try {
                    await SafeAsyncStorage.removeItem('userData');
                  } catch (e) {
                    console.warn('Failed to clear cached user data:', e.message);
                  } finally {
                    if (isEffectMounted) {
                      setLoading(false);
                      setAuthChecked(true);
                    }
                  }
                }
              } catch (error) {
                console.error('Auth state change error:', error);

                // If it's a network error, try to use cached data
                if (error.code === 'auth/network-request-failed' || error.code === 'unavailable') {
                  console.log('Network error - trying to use cached data');
                  try {
                    const cachedUser = await SafeAsyncStorage.getItem('userData');
                    if (cachedUser) {
                      console.log('Using cached user data');
                      setUser(JSON.parse(cachedUser));
                    } else if (retryCount < maxRetries) {
                      // Exponential backoff for retries
                      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                      console.log(`Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
                      retryCount++;
                      cleanupRetryTimeout = setTimeout(() => {
                        if (isEffectMounted && isSubscribed) {
                          execute();
                        }
                      }, delay);
                      return;
                    }
                  } catch (e) {
                    console.warn('Error handling network failure:', e.message);
                  }
                }
              } finally {
                if (isEffectMounted) {
                  setLoading(false);
                  setAuthChecked(true);
                }
              }
            },
            // Error callback
            (error) => {
              console.error('Auth state listener error:', error);
              if (isEffectMounted && retryCount < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                console.log(`Retrying auth listener in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
                retryCount++;
                cleanupRetryTimeout = setTimeout(() => {
                  if (isEffectMounted && isSubscribed) {
                    execute();
                  }
                }, delay);
              }
            }
          );
        } catch (error) {
          console.error('Error in auth listener:', error);
          if (isEffectMounted && isSubscribed) {
            setLoading(false);
            setAuthChecked(true);
          }
        }
      };

      // Start the listener
      execute();

      // Return cleanup function
      return cleanup;
    };

    // Set up the auth listener and return cleanup function
    return setupAuthListener();
    }, []);
  /**
   * Save user data to Firestore and update local state
   * @param {Object} userData - User data to save
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  const saveUserData = async (userData) => {
    if (!isMounted.current) return false;

    try {
      if (!userData?.uid) {
        throw new Error('Cannot save user data: No user UID provided');
      }

      console.log('Saving user data for UID:', userData.uid);
      const { doc, setDoc, serverTimestamp } = require('firebase/firestore');

      // Prepare user data for Firestore
      const userToSave = {
        ...userData,
        updatedAt: serverTimestamp(),
        lastLogin: new Date().toISOString(),
        email: userData.email ? userData.email.toLowerCase().trim() : '',
        // Ensure we don't store sensitive or unnecessary fields
        password: undefined,
        confirmPassword: undefined,
      };

      // Save to Firestore using UID as document ID (recommended)
      const userRef = doc(db, 'users', userData.uid);
      await setDoc(userRef, userToSave, { merge: true });
      console.log('User data saved to Firestore with UID:', userData.uid);

      // Update local state
      setUser((prev) => ({
        ...prev,
        ...userToSave,
      }));

      return true;
    } catch (error) {
      console.error(' Error saving user data:', {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });
      return false;
    }
  };

  /**
   * Clear user data on logout
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  const clearUserData = async () => {
    if (!isMounted.current) return false;

    try {
      console.log(' Starting user sign out process...');
      setLoading(true);

      // Clear local state first to update UI immediately
      setUser(null);

      try {
        // Clear any cached data
        await SafeAsyncStorage.removeItem('userData');
        await SafeAsyncStorage.removeItem('authToken');
        console.log(' Cleared local storage data');
      } catch (storageError) {
        console.warn(' Failed to clear local storage:', storageError);
        // Continue with sign out even if clearing storage fails
      }

      // Sign out from Firebase Auth
      if (auth.currentUser) {
        console.log(' Signing out from Firebase...');
        try {
          await firebaseSignOut(auth);
          console.log(' Successfully signed out from Firebase');
        } catch (signOutError) {
          console.error(' Error signing out from Firebase:', signOutError);
          // Even if sign out fails, we want to clear the local state
          return false;
        }
        console.log(' User signed out from Firebase Auth');
      }

      // Clear local storage
      await SafeAsyncStorage.removeItem('userData');

      // Reset state
      setUser(null);

      console.log(' User data cleared successfully');
      return true;
    } catch (error) {
      console.error(' Error clearing user data:', {
        error: error.message,
        code: error.code,
      });
      return false;
    }
  };

  // Only render children once auth state is checked
  // This prevents flash of unauthenticated content
  const shouldRenderChildren = !loading || authChecked;

  // Prepare context value
  const contextValue = {
    user,
    isAuthenticated: !!user,
    isLoading: loading,
    isAuthChecked: authChecked,
    saveUserData,
    clearUserData,
  };

  if (__DEV__) {
    console.log(' UserContext render', {
      user: user ? 'authenticated' : 'not authenticated',
      loading,
      authChecked,
    });
  }

  return (
    <UserContext.Provider value={contextValue}>
      {shouldRenderChildren ? children : null}
    </UserContext.Provider>
  );
};

/**
 * Custom hook to access the user context
 * @returns {Object} The user context containing { user, saveUserData, clearUserData, loading }
 * @throws Will throw an error if used outside of a UserProvider
 */
export const useUser = () => {
  const context = useContext(UserContext);
  const isInitialMount = useRef(true);

  // Debug log to help track hook usage (development only)
  useEffect(() => {
    if (__DEV__) {
      // Only log in development
      if (context?.user) {
        console.log(' User authenticated -', context.user.email);
      } else if (context && !context.loading) {
        console.log(' No active user session');
      }

      // Log only on first mount
      if (isInitialMount.current) {
        console.log(' useUser: Hook initialized');
        isInitialMount.current = false;
      }
    }
  }, [context]);

  if (context === undefined) {
    return {
      user: null,
      userData: null,
      loading: true,
      isAuthenticated: false,
      clearUserData: () => { },
      saveUserData: async () => false,
    };
  }

  // Map the context to match the expected format in HomeScreen
  const mappedContext = {
    ...context,
    // For backward compatibility, expose userData as user
    userData: context.user || null,
    // Alias user for clarity
    user: context.user || null,
    // Add loading state
    loading: context.loading || !context.authChecked,
    // Add isAuthenticated helper
    isAuthenticated: !!context.user,
    // Ensure clearUserData exists
    clearUserData: context.clearUserData || (() => { }),
    // Ensure saveUserData exists
    saveUserData: context.saveUserData || (async () => false),
  };

  return mappedContext;
};

export default UserContext;
