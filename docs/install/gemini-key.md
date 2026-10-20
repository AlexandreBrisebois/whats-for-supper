# Get a Gemini API key

What's for Supper uses Google's Gemini API for recipe-related AI features. You need **one Gemini API key** for the initial installation; the app's model names are already configured in the supplied `.env.example`.

1. Open [Google AI Studio — API keys](https://aistudio.google.com/app/apikey) and sign in with your Google account.
2. Select **Create API key**. Choose or create a Google Cloud project when prompted.
3. Copy the new key and keep it private. Don't paste it into GitHub issues, chat screenshots, or public files.
4. When `bash setup.sh` asks for **Gemini API key**, paste it into the hidden prompt. The helper stores it locally in the private `.env` file.
5. Continue setup. You do **not** need to create a separate key for each model.

**Models and costs:** The supplied configuration names the text, image, and embedding models. Availability, quotas, billing requirements, and prices can change. Check [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [available models](https://ai.google.dev/gemini-api/docs/models), and your AI Studio project's limits before enabling usage. A key does not guarantee that every configured model is available to your account. Some operations may incur charges.

**If setup or AI features fail:** Check that the key belongs to the intended project, the Gemini API is available for it, and the configured model IDs are supported. See [Google's official API-key documentation](https://ai.google.dev/gemini-api/docs/api-key). Never include the actual key in logs or support requests.

For experienced operators: `GEMINI_API_KEY`, `GEMINI_MODEL_ID`, `GEMINI_MODEL_ID_HERO`, and `EMBEDDING_MODEL_ID` are configured in `.env`. Keep the tested release defaults unless you intentionally validate different models.
