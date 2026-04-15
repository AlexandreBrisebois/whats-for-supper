# Recipe API Specification

The Recipe API is responsible for receiving recipe uploads, storing images and metadata, and notifying downstream services via Redis. It is designed to run within a Docker container.

## Core Concepts

- **Recipe ID**: A unique identifier (GUID) generated upon upload.
- **Rating**: A numerical value representing user preference (0-3).
- **Storage**: A structured directory on disk for images and metadata.
- **Redis Notification**: An external notification triggered after a successful save by sending a message to a Redis Stream.

## API Endpoints

### 1. Upload Recipe
`POST /api/recipes`

Uploads a recipe with a rating and one or more image files.

- **Content-Type**: `multipart/form-data`
- **Request Parameters**:
    - `rating` (string/int): Selection from `0` (Unknown), `1` (Dislike), `2` (Like), or `3` (Love).
    - `cookedMealImageIndex` (int): The index of the image in the `files` array that shows the cooked meal (hero image).
    - `files` (file): One or more image files.
- **Responses**:
    - `200 OK`: Returns the generated `recipeId`.
      ```json
      { "recipeId": "550e8400e29b41d4a716446655440000" }
      ```
    - `400 Bad Request`: Validation errors (e.g., missing rating, no images, invalid rating value).
    - `500 Internal Server Error`: Server-side processing failure.

### 2. Get Recipe Image (Binary)
`GET /recipe/{recipeId}/original/{photoId:int}`

Retrieves a specific image for a recipe as a binary stream.

- **Path Parameters**:
    - `recipeId`: The unique identifier of the recipe.
    - `photoId`: The index of the image (0-based).
- **Responses**:
    - `200 OK`: Returns the raw image bytes.
        - **Content-Type**: `image/jpeg`, `image/png`, etc. (matches source file).
    - `404 Not Found`: Image not found.
    - `500 Internal Server Error`: File reading failure.

### 3. Family Identities
#### 3.1 Get Family Members
`GET /api/family`

Retrieves the list of defined family members for the household.

- **Responses**:
    - `200 OK`: Returns a list of family member objects.
      ```json
      [
        { "id": "mom", "name": "Mom" },
        { "id": "dad", "name": "Dad" },
        { "id": "alex", "name": "Alex" }
      ]
      ```

#### 3.2 Add Family Member
`POST /api/family`

Adds a new family member to the household.

- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  { "name": "New Member Name" }
  ```
- **Responses**:
    - `200 OK`: Returns the generated family member ID.
      ```json
      { "id": "new-member-id" }
      ```
    - `400 Bad Request`: Validation errors (e.g., name already exists or is empty).

#### 3.3 Remove Family Member
`DELETE /api/family/{id}`

Removes a family member from the household.

- **Path Parameters**:
    - `id`: The unique identifier of the family member.
- **Responses**:
    - `200 OK`: Member successfully removed.
    - `404 Not Found`: Member not found.
    - `400 Bad Request`: Cannot remove member if they have associated records (optional constraint depending on implementation).

## Storage Structure

The API stores data relative to a base path (configured via `RECIPES_ROOT`).

```text
{RECIPES_ROOT}/
└── {recipeId}/
    ├── recipe.info
    └── original/
        ├── {recipeId}_0.jpg
        ├── {recipeId}_1.png
        └── ...
```

### Metadata (recipe.info)
Contains details about the upload:
- `rating`: Integer value (0-3).
- `ratingType`: String value (`unknown`, `dislike`, `like`, `love`).
- `addedDate`: ISO 8601 timestamp.
- `addedBy`: Identifier of the family member who captured the recipe.
- `imageCount`: Number of images stored.
- `cookedMealImageIndex`: The index of the image that shows the cooked meal.
- `images`: An array of objects representing the stored files:
    - `name`: Local filename (`{recipeId}_{index}.jpg`).
    - `originalName`: Original filename from the user's device.
    - `contentType`: MIME type.
    - `size`: File size in bytes.

## External Notifications

Upon successful storage, the API triggers a notification by sending a message to a Redis Stream (e.g., `recipe:import:queue`).

- **Target**: Redis Stream
- **Payload**:
  ```json
  {
    "recipeId": "{recipeId}",
    "imageUrls": [
      "{API_BASE_URL}/recipe/{recipeId}/original/0",
      "{API_BASE_URL}/recipe/{recipeId}/original/1"
    ]
  }
  ```

This message triggers the downstream Recipe Import Worker.

## Configuration

The API is configured via environment variables, typically provided through Docker or an orchestration layer. The following variables are required:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `RECIPES_ROOT` | Base path for storing recipe data. | `./recipes` |
| `REDIS_CONNECTION_STRING` | Connection string for the Redis instance. | `localhost:6379` |
| `REDIS_STREAM_NAME` | The name of the Redis Stream to send messages to. | `recipe:import:queue` |
| `API_BASE_URL` | Base URL used to construct `imageUrls` in the message. | (Required) |
