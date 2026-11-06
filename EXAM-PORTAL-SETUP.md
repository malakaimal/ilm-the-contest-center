# ILM Exam Portal: first setup

This is a separate examination system. It does not connect to or modify the existing ILM admissions/results spreadsheet.

## 1. Create the new Google spreadsheet

1. Open https://script.google.com/home while signed in to the ILM Google account.
2. Choose **New project**.
3. Rename it **ILM Exam Portal Backend**.
4. Open `exam-backend/Code.gs` in this GitHub repository, copy all its code, and replace the starter code in Apps Script.
5. Save the project.
6. In the function dropdown, select `setupExamDatabase` and press **Run**.
7. Review and approve the Google authorization screen.
8. Open **Execution log**. Copy the `spreadsheetUrl` value. This is the newly created exam spreadsheet.

The setup function creates a new spreadsheet called **ILM Online Examination Database** with these tabs:
- Test Sessions
- Student Test Access
- Test Questions
- Student Responses
- Test Results
- Monitoring Events
- Recording Records

Do not paste student personal information into public GitHub files. Keep the spreadsheet shared only with authorized ILM administrators.

## 2. Add a sample test manually

In **Test Sessions**, add a row with a unique Test ID, test name, class, start/end times, duration, status and instructions. Set Status to `Published` only when the test is ready.

In **Student Test Access**, add the student's Registration ID, the same Test ID, a unique private Access Code, assigned date and status `Assigned`.

In **Test Questions**, add one row per question. Use A, B, C or D in Correct Option. The correct answer is not sent to the student browser.

## 3. Deploy the backend

1. In Apps Script choose **Deploy → New deployment**.
2. Select type **Web app**.
3. Set **Execute as** to your account.
4. Set access to **Anyone** only if ILM intends students to use the public student portal. The API still requires the assigned Registration ID and private Access Code for student operations.
5. Deploy and copy the Web App URL ending in `/exec`.
6. In GitHub open `exam-config.js`, replace the placeholder with the URL, and commit the change.

Never put a Google service-account key, service-role key or admin password in GitHub.

## 4. Open the portals

- Student portal: `https://malakaimal.github.io/ilm-the-contest-center/exam-student.html`
- Admin setup guide: `https://malakaimal.github.io/ilm-the-contest-center/exam-admin.html`
- Test centre landing page: `https://malakaimal.github.io/ilm-the-contest-center/test.html`

The admin page is currently a setup guide, not a secure online admin dashboard. Manage the spreadsheet directly with restricted Google account access.

## 5. Monitoring and AI status

The current portal can request camera and screen-sharing permission after the student reads the notice and gives consent. It displays the streams locally and stops them when the page closes. It does not record or upload camera/screen video, and it does not run an AI model.

AI proctoring, face-presence detection, recording, secure recording retention, and a full admin review dashboard are later phases. Do not describe the current version as AI-proctored. Before adding recording, ILM must define clear notice, consent, access restrictions, retention/deletion rules and an alternative process for students who cannot use camera or screen sharing.
