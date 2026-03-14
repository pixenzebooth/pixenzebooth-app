/**
 * PixenzeBooth — Google Drive Upload Script
 * 
 * Deploy sebagai Web App:
 * 1. Buka script.google.com → New Project
 * 2. Paste kode ini
 * 3. Ganti ROOT_FOLDER_ID dengan ID folder Google Drive Anda
 * 4. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy URL dan simpan di .env.local sebagai VITE_GOOGLE_SCRIPT_URL
 * 
 * Struktur Folder:
 *   📁 PixenzeBooth (ROOT_FOLDER_ID)
 *     └── 📁 2026-03-03 (tanggal otomatis)
 *           └── 📁 Nama User (dari input)
 *                 ├── strip_xxx.jpg
 *                 ├── original_1.jpg
 *                 ├── original_2.jpg
 *                 ├── video_xxx.mp4
 *                 └── animated_xxx.gif
 */

// ⚠️ GANTI DENGAN ID FOLDER GOOGLE DRIVE ANDA
const ROOT_FOLDER_ID = '13kwfryFE0U_89m1MOy3JI9hzGG9p1hc9';

/**
 * Handle POST request dari frontend
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const userName = (payload.userName || 'Guest').trim();
    const userEmail = (payload.userEmail || '').trim();
    const files = payload.files || [];

    if (files.length === 0) {
      return jsonResponse({ status: 'error', message: 'No files provided.' });
    }

    // 1. Get or create date folder (YYYY-MM-DD)
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const dateFolder = getOrCreateFolder(rootFolder, today);

    // 2. Get or create user folder inside date folder
    const userFolder = getOrCreateFolder(dateFolder, userName);

    // 3. Upload all files
    const uploadedFiles = [];
    for (const file of files) {
      try {
        const decoded = Utilities.base64Decode(file.data);
        const blob = Utilities.newBlob(decoded, file.mimeType, file.name);
        const driveFile = userFolder.createFile(blob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        uploadedFiles.push({
          name: file.name,
          url: driveFile.getUrl(),
          id: driveFile.getId(),
          size: driveFile.getSize()
        });
      } catch (fileErr) {
        uploadedFiles.push({
          name: file.name,
          error: fileErr.message
        });
      }
    }

    // 4. Send Email if email address is provided
    if (userEmail) {
      try {
        const emailBody = `Halo ${userName},\n\nTerima kasih telah menggunakan Pixenze Booth!\n\nSemua foto dan video kamu sudah disimpan dengan aman di Google Drive. Kamu bisa melihat dan mendownload hasilnya melalui link berikut:\n\n${userFolder.getUrl()}\n\nSalam Hangat,\nTim Pixenze Booth`;
        MailApp.sendEmail({
          to: userEmail,
          subject: 'Your Pixenze Booth Moments!',
          body: emailBody
        });
      } catch (emailErr) {
        // Ignore email fetch errors to not fail the Drive upload
      }
    }

    return jsonResponse({
      status: 'success',
      folderUrl: userFolder.getUrl(),
      uploadedFiles: uploadedFiles
    });

  } catch (err) {
    return jsonResponse({
      status: 'error',
      message: err.message || 'Unknown error occurred.'
    });
  }
}

/**
 * Handle GET request (for testing)
 */
function doGet(e) {
  return jsonResponse({
    status: 'ok',
    message: 'PixenzeBooth Drive Uploader is running.',
    version: '1.0.0'
  });
}

/**
 * Find or create a subfolder by name inside a parent folder.
 */
function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Return a JSON response with proper CORS headers.
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
