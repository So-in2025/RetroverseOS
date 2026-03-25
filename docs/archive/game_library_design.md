# GAME LIBRARY SYSTEM DESIGN

## 1. Database Schema (Firestore)

The `games` collection stores metadata for each retro game available in the library.

### Entity: `games`
- `game_id` (string, required): Unique identifier for the game.
- `title` (string, required): Title of the game.
- `system` (string, required): The console system (e.g., NES, SNES, Genesis).
- `genre` (string, optional): Genre of the game.
- `release_year` (number, optional): Year of release.
- `developer` (string, optional): Developer of the game.
- `publisher` (string, optional): Publisher of the game.
- `thumbnail_url` (string, optional): URL to the game thumbnail.
- `rom_path` (string, required): Path to the ROM file in storage.

## 2. API Endpoints

The API is designed for efficient retrieval, searching, and filtering of the game library.

### Fetch Games
`GET /api/games`

- **Description**: Fetches a paginated list of games.
- **Query Parameters**:
    - `page` (number, optional, default: 1): Page number.
    - `limit` (number, optional, default: 20): Number of games per page.
    - `system` (string, optional): Filter by console system.
    - `genre` (string, optional): Filter by genre.
    - `search` (string, optional): Search by title, developer, or publisher.
- **Response**:
    ```json
    {
      "games": [...],
      "total": 100,
      "page": 1,
      "limit": 20
    }
    ```

### Fetch Game Details
`GET /api/games/:gameId`

- **Description**: Fetches details for a specific game.
- **Response**:
    ```json
    {
      "game_id": "...",
      "title": "...",
      ...
    }
    ```
