# Recipe Upload System Implementation

## Overview
This implementation provides a complete recipe upload system that saves recipes with images to organized folder structures on the API service.

## Folder Structure

When a recipe is saved, it creates the following structure:
```
recipes/
??? {RECIPE_GUID}/
    ??? info.json
    ??? original/
        ??? {RECIPE_GUID}_0.jpg
        ??? {RECIPE_GUID}_1.jpg
        ??? {RECIPE_GUID}_N.jpg
```

## Components

### API Service (`WhatsForSupper.Import.ApiService`)

#### Models
- **RecipeInfo.cs**: Contains metadata for a recipe (rating, rating type, added date, image count)
- **UploadRecipeRequest.cs**: Request model with rating and image data

#### Services
- **RecipeStorageService.cs**: Handles the disk storage logic for recipes and images

#### API Endpoint
- **POST /api/recipes**: Accepts recipe data with images and saves to organized folder structure

### Frontend (`WhatsForSupper.Import.Web`)

#### Components
- **UploadRecipe.razor**: Blazor component for uploading recipe photos and rating

## Key Features

1. **Unique Recipe IDs**: Each recipe gets a unique GUID as its identifier
2. **Image Organization**: Images are stored in an `original` subfolder with the format `{GUID}_{index}.{ext}`
3. **Metadata Storage**: Each recipe has an `info.json` file containing:
   - Rating (1, 2, or 3)
   - Rating Type ("dislike", "like", "love")
   - Added Date (UTC timestamp)
   - Image Count

4. **Rating System**:
   - 1 = Dislike (??)
   - 2 = Like (??)
   - 3 = Love (??)

5. **Error Handling**: If saving fails, the recipe folder is automatically cleaned up

## API Usage

### Upload Recipe

**Endpoint**: `POST /api/recipes`

**Request Body**:
```json
{
  "rating": 3,
  "images": [
    {
      "fileName": "photo1.jpg",
      "contentType": "image/jpeg",
      "data": [base64-encoded-bytes]
    },
    {
      "fileName": "photo2.jpg",
      "contentType": "image/jpeg",
      "data": [base64-encoded-bytes]
    }
  ]
}
```

**Response**:
```json
{
  "recipeId": "a1b2c3d4e5f6g7h8"
}
```

## Frontend Flow

1. User selects one or more JPEG images
2. Images are displayed as previews
3. User rates the recipe (dislike, like, or love)
4. On save, all image data and rating are sent to the API
5. API creates organized folder structure and returns recipe ID
6. User is redirected to home page

## Files Modified/Created

### Created
- `WhatsForSupper.Import.ApiService/Models/RecipeInfo.cs`
- `WhatsForSupper.Import.ApiService/Models/UploadRecipeRequest.cs`
- `WhatsForSupper.Import.ApiService/Services/RecipeStorageService.cs`

### Modified
- `WhatsForSupper.Import.ApiService/Program.cs` - Added recipe upload endpoint and service registration
- `WhatsForSupper.Import.Web/Components/Pages/UploadRecipe.razor` - Integrated with new API endpoint
