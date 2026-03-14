# Google Apps Script Backend for PixenzeBooth

Since PixenzeBooth is a frontend-only application (Vite/React), we need a backend service to handle:
1.  Uploading files to Google Drive (to save Supabase storage space).
2.  Generating a public shareable link.
3.  Sending an email to the user with that link.

**Google Apps Script (GAS)** is a perfect free solution for this.

## Setup Instructions

1.  Go to [script.google.com](https://script.google.com/) and click **"New Project"**.
2.  Name the project "PixenzeBooth Backend".
3.  Delete any code in `Code.gs` and paste the script below completely.
4.  **Save** the project (Ctrl+S).
5.  Click **Deploy** > **New Deployment**.
6.  Click the **Select type** icon (gear) > **Web App**.
7.  Fill in the details:
    *   **Description**: "PixenzeBooth API"
    *   **Execute as**: **Result: "Me" (your email)**.
    *   **Who has access**: **Result: "Anyone"**. (CRITICAL: Must be "Anyone" so your app can call it without login).
8.  Click **Deploy**.
    *   You will be asked to **Authorize Access**. Click "Review Permissions".
    *   Choose your account.
    *   If you see "Google hasn't verified this app", click **Advanced** > **Go to PixenzeBooth Backend (unsafe)**.
    *   Click **Allow**.
9.  Copy the **Web App URL** (e.g., `https://script.google.com/macros/s/.../exec`).
10. **Save this URL!** You will need to paste it into your application code (in `src/services/googleDriveService.js` or `.env.local`).

## The Script Code

```javascript
function doPost(e) {
  try {
    // 1. Parse Data
    var data = JSON.parse(e.postData.contents);
    var imageBase64 = data.image; // Expecting base64 string without data:image/png;base64, prefix
    var email = data.email;
    var filename = "PixenzeBooth_" + new Date().toISOString() + ".png";

    // 2. Decode Image
    var decoded = Utilities.base64Decode(imageBase64);
    var blob = Utilities.newBlob(decoded, "image/png", filename);

    // 3. Save to Google Drive
    // Logic for separating Winners photos for easier printing
    var folderName = "PixenzeBooth Uploads"; // Default folder
    
    if (data.isWinner) {
      folderName = "PixenzeBooth_WINNERS_PRINT"; // Special folder for winners
    }

    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    var file = folder.createFile(blob);
    
    // 4. Set Permissions (Anyone with link can view)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileUrl = file.getUrl();
    var downloadUrl = file.getDownloadUrl(); // Direct download link logic varies, getUrl is safer for sharing

    // 5. Send Email
    if (email) {
      var subject = "Your PixenzeBooth Photo is Ready! ✨";
      var body = "Hi there!\n\n" +
                 "Thanks for using PixenzeBooth. Here is the link to download your photo strip:\n\n" +
                 fileUrl + "\n\n" +
                 "Keep shining!\n" +
                 "- PixenzeBooth Team";
                 
      var htmlBody = "<div style=\"background-color: #18181b; padding: 40px 20px; font-family: 'Courier New', Courier, monospace; color: #ffffff;\">" +
                     "<div style=\"max-width: 600px; margin: 0 auto; background-color: #27272a; border: 4px solid #ffffff; padding: 2px; box-shadow: 10px 10px 0px #000000;\">" +
                     "<div style=\"border: 2px solid #ffffff; padding: 30px; text-align: center;\">" +
                     "<h1 style=\"font-family: Arial, sans-serif; font-weight: 900; font-size: 32px; color: #face10; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 0 #000;\">MISSION COMPLETE</h1>" +
                     "<p style=\"color: #a1a1aa; font-size: 14px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px;\">Digital Artifact Secured</p>" +
                     "<p style=\"color: #ffffff; font-size: 16px; line-height: 1.6; margin-bottom: 30px;\">Your photo strip has been processed and saved. Use the link below to retrieve your digital copy.</p>" +
                     "<a href=\"" + fileUrl + "\" style=\"background-color: #00E055; color: #000000; padding: 15px 30px; font-weight: bold; font-family: Arial, sans-serif; text-decoration: none; border: 3px solid #000000; display: inline-block; box-shadow: 4px 4px 0px #000000; text-transform: uppercase;\">DOWNLOAD ARTIFACT</a>" +
                     "<div style=\"margin-top: 40px; padding-top: 20px; border-top: 2px dashed #3f3f46; font-size: 12px; color: #71717a;\">" +
                     "<p>SESSION ID: " + new Date().getTime().toString().slice(-6) + "</p>" +
                     "<p>THANK YOU FOR PLAYING AT PIXENZEBOOTH</p>" +
                     "<p style=\"margin-top: 10px;\"><a href=\"" + fileUrl + "\" style=\"color: #00E055; text-decoration: none; word-break: break-all;\">" + fileUrl + "</a></p>" +
                     "</div></div></div></div>";

      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body,
        htmlBody: htmlBody
      });
    }

    // 6. Return Success Response
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      url: fileUrl,
      message: "File uploaded and email sent!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle OPTIONS request for CORS (Cross-Origin Resource Sharing)
function doOptions(e) {
  var output = ContentService.createTextOutput("");
  return output;
}

```
