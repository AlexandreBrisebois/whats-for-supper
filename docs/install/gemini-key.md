# Get a Gemini API key

What's for Supper uses Gemini for recipe-related AI features. You'll need one API key to get started.

1. Open [Google AI Studio — API keys](https://aistudio.google.com/app/apikey) and sign in with your Google account.
2. Select **Create API key**. Choose or create a Google Cloud project when prompted.
3. Copy the new key and keep it private. Don't paste it into GitHub issues, chat screenshots, or public files.
4. When `bash setup.sh` asks for **Gemini API key**, paste it into the hidden prompt. The helper stores it locally in the private `.env` file.
5. Continue setup. One key is enough for the configured models, subject to your project's access and limits.

## Questions or advanced configuration

**Will it cost anything?** Gemini API usage may incur charges, depending on the models, quotas, and billing settings for your project. Check [Google's pricing](https://ai.google.dev/gemini-api/docs/pricing) before using the app.

**Key not working?** Confirm the key belongs to the intended Google Cloud project and that the configured models are available. See [Google's API key guide](https://ai.google.dev/gemini-api/docs/api-key).

**Choosing different models?** The installation includes tested defaults for text, image, and embeddings. Advanced operators can configure `GEMINI_MODEL_ID`, `GEMINI_MODEL_ID_HERO`, and `EMBEDDING_MODEL_ID` in `.env`. Check [available models](https://ai.google.dev/gemini-api/docs/models) before changing them.
