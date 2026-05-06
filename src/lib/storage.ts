import { uploadToGoogleDrive } from './google-drive';
import { db, doc, getDoc, updateDoc } from '../firebase';

export async function uploadPetPhoto(
  petId: string,
  file: File,
  options?: { ownerName?: string; petName?: string }
): Promise<string> {
  const result = await uploadToGoogleDrive(file, {
    ownerName: options?.ownerName || 'Unknown',
    petName: options?.petName || petId,
    fileType: 'photos',
  });
  return result.downloadUrl || result.webViewLink;
}

export async function deletePetPhoto(photoURL: string): Promise<void> {
  console.log('[Storage] Delete not yet supported for Google Drive photos:', photoURL);
}

export async function updatePetPhoto(
  petId: string,
  newFile: File,
  oldPhotoURL?: string
): Promise<string> {
  const petSnap = await getDoc(doc(db, 'pets', petId));
  const petData = petSnap.data();
  const ownerName = petData?.ownerName || 'Unknown';
  const petName = petData?.name || petId;

  const newPhotoURL = await uploadPetPhoto(petId, newFile, { ownerName, petName });

  await updateDoc(doc(db, 'pets', petId), { imageUrl: newPhotoURL });

  return newPhotoURL;
}
