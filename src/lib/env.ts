import 'dotenv/config';

export const env = {
  TRELLO_KEY: process.env.TRELLO_KEY!,
  TRELLO_TOKEN: process.env.TRELLO_TOKEN!,
  TRELLO_BOARD_ID: process.env.TRELLO_BOARD_ID!,
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
}; 