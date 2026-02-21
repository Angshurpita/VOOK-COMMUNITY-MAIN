# VOOK Backend

This is the Node.js/Express backend for the VOOK application. It manages API interactions and integrates with Supabase.

## Structure

- `index.js`: Main server entry point.
- `database/`: Contains SQL scripts and Supabase configuration.
- `routes/`: (Future) API route definitions.
- `controllers/`: (Future) Request handlers.

## setup

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Set up environment variables:
    - Copy `.env.example` to `.env`.
    - Fill in your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3.  Run the server:
    ```bash
    npm run dev
    ```

## Deployment

This project is ready to be deployed on services like Render, Railway, or Heroku.
- **Build Command**: `npm install`
- **Start Command**: `npm start`
