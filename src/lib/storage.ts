/**
 * Utility functions for Firebase Storage operations
 * Handles pet photo uploads and management
 */

import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload a pet photo to Firebase Storage
 * @param petId - The pet's ID
 * @param file - The image file to upload
 * @returns The download URL of the uploaded image
 */
export async function uploadPetPhoto(petId: string, file: File): Promise<string> {
  try {
    // Create a reference to the file location: pets/{petId}/{timestamp}_{filename}
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `pets/${petId}/${fileName}`);

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading pet photo:', error);
    throw error;
  }
}

/**
 * Delete a pet photo from Firebase Storage
 * @param photoURL - The download URL of the photo to delete
 */
export async function deletePetPhoto(photoURL: string): Promise<void> {
  try {
    // Extract the storage reference from the URL
    const storageRef = ref(storage, photoURL);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting pet photo:', error);
    throw error;
  }
}

/**
 * Update a pet's photo in Firestore and Storage
 * - Uploads new photo
 * - Updates pet document with new imageUrl
 * - Deletes old photo if exists
 */
export async function updatePetPhoto(
  petId: string,
  newFile: File,
  oldPhotoURL?: string
): Promise<string> {
  try {
    // Upload new photo
    const newPhotoURL = await uploadPetPhoto(petId, newFile);

    // Delete old photo if exists
    if (oldPhotoURL && oldPhotoURL.includes('firebasestorage')) {
      try {
        await deletePetPhoto(oldPhotoURL);
      } catch (error) {
        console.warn('Could not delete old photo:', error);
      }
    }

    return newPhotoURL;
  } catch (error) {
    console.error('Error updating pet photo:', error);
    throw error;
  }
}
