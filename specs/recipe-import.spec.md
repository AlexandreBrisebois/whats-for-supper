# Recipe Import Worker Specification

The Recipe Import Worker is a service designed to process raw recipe imports by extracting structured data from images and generating high-quality hero thumbnails. It runs within its own Docker container and follows a two-pass AI pipeline to ensure local data sovereignty for text while utilizing cloud-based models for high-fidelity image processing.

## 1. System Overview

- **Trigger**: Redis Stream message containing `recipeId`.
- **Primary Data Source**: Local NAS filesystem.
- **Text Extraction Model**: Gemma 4:e4b (Local).
- **Hero Extraction Model**: Gemini Image Pro 3.1 (Google GenAI).

## 2. Input Structure

### 2.1 Queue Message (Redis)
The worker listens for messages on a Redis Stream (e.g., `recipe:import:queue`). Each message contains:
- `recipeId`: The unique ID of the recipe (used as the folder name).
- `imageUrls`: A list of URLs pointing to the original images for processing.

### 2.2 Directory Structure
The worker operates on the following structure located on the NAS:
```text
/recipes/{recipeId}/
├── recipe.info (JSON) - Input metadata
└── originals/         - Directory containing raw JPEG/PNG images
```

### 2.3 `recipe.info` (Input)
A JSON file containing initial user-provided data:
- `rating`: Integer (0-3).
- `ratingType`: String (e.g., "love", "like").
- `imageCount`: Number of files in `originals/`.

## 3. Processing Pipeline

### 3.1 Pass 1: Local Extraction & Tagging
- **Model**: Gemma 4:e4b (Local via Ollama/Service).
- **Input**: All images in the `originals/` folder.
- **Logic**:
    1. Perform OCR and structured data extraction.
    2. Format output as `Schema.org/Recipe` JSON.
    3. **Hero Identification**: Analyze the images to determine which one contains the "ready to serve" (cooked) recipe.
- **Output**:
    - Create `recipe.json` in the recipe root folder.
    - Update `recipe.info` with `heroImageSource`: "filename.jpg".

### 3.2 Pass 2: Hero Thumbnail Generation
- **Model**: Gemini Image Pro 3.1 (Google GenAI).
- **Input**: The binary hero image identified in Pass 1 (read from disk or API).
- **Logic**: 
    - **JIT Encoding**: Encode the binary image to Base64 for the `inline_data` payload required by the Gemini API.
    - Extract the visual subject matter and generate a high-quality hero thumbnail.
    - Transform/Enhance based on the "What's For Supper" aesthetic.
- **Output**:
    - Save as `hero.jpg` in the recipe root folder.

## 4. Final Output State

After successful processing, the directory should contain:
```text
/recipes/{recipeId}/
├── recipe.info      (Updated with Hero metadata)
├── recipe.json      (Structured Schema.org data)
├── hero.jpg         (AI-generated thumbnail)
└── originals/       (Raw source images)
```

## 5. Error Handling
- **Missing Images**: If no images are found, the job is moved to a dead-letter stream.
- **Extraction Failure**: If Gemma fails to structure the data, it will be retried up to 3 times before failing the job.
- **Missing Hero Flag**: If no image is flagged as the hero, the worker will default to the first image found in `originals/` for Pass 2.
