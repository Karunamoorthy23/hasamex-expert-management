# Final n8n Configuration Steps

This guide explains exactly what you need to click and do to finish linking n8n with your backend.

## Step 1: Import the Workflow into n8n

1. Open your browser and go to **http://localhost:5678**
2. On the left sidebar, click on **Workflows**, then click **Add Workflow** in the top right.
3. Click the menu icon (three dots `...` in the top right corner of the canvas) and select **Import from File**.
4. Select the file located at:
   `c:\Users\User\Desktop\demo\Expert-Searching-App\n8n\project_created_linkedin_enrichment.json`
5. The workflow will now appear on your screen, showing two boxes: `Project Created Webhook` and `Search Experts via Backend`.

---

## Step 2: Attach Your Bearer Token

We need to tell the `Search Experts via Backend` node to use the Bearer Token you created.

1. Double-click the second node named **Search Experts via Backend** (the HTTP Request node).
2. A settings panel will open on the right. Scroll down to **Authentication**.
3. Under **Credential to connect with**, click the dropdown and select the **Bearer Auth** credential you previously created.
4. Close the settings panel (click back to canvas).

---

## Step 3: Test the Webhook (Very Important!)

Before activating everything, we must test if n8n receives the project data properly.

1. Double-click the first node named **Project Created Webhook**.
2. Click the big **"Listen for Test Event"** button. (It will start spinning/loading).
3. Leave n8n open and go to your **Expert-Searching-App Frontend** (in a new tab/window).
4. **Create a new Project** in your app as you normally would (fill out companies, titles, etc. and submit).
5. Go back to the n8n tab. You should see "Workflow executed successfully," and the project data will pop up on the screen!

---

## Step 4: Turn the Workflow ON

Now that testing works, let's make it permanent.

1. In the top right corner of the n8n screen, there is an **Active** toggle switch. 
2. Click it so it turns **Green (ON)**. 
3. *Note: Once this is ON, n8n listens to the `/webhook/` URL instead of `/webhook-test/`.*

---

## Step 5: Update the Backend

We need to tell the Flask backend to use the real, permanent webhook URL instead of the test one.

1. Open VS Code and open your `flask.env` file.
2. Find **line 49**:
   ```env
   N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/project-created
   ```
3. Remove `-test` from that line, so it looks exactly like this:
   ```env
   N8N_WEBHOOK_URL=http://localhost:5678/webhook/project-created
   ```
4. Save the `flask.env` file.

---

## Step 6: Restart the Backend

Your backend needs to restart to read the new `flask.env` file.

1. Open your terminal where your Flask backend is running (`python app.py`).
2. Press `Ctrl + C` to stop the server.
3. Run the server again:
   ```powershell
   python app.py
   ```

**You are done! 🎉** 
Now, every time you create a new project in the web app, it will automatically search LinkedIn for experts behind the scenes.
