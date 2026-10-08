/**
 * Client-side upload rules.
 * Keep in sync with the backend default `MAX_IMAGE_SIZE_MB` in `.env.example`
 * — the server is the authority, this is just fast feedback for the user.
 */
export const MAX_IMAGE_SIZE_MB = 5
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export const IMAGE_ACCEPT_ATTRIBUTE = ALLOWED_IMAGE_TYPES.join(',')

export const EXAMPLE_PROMPTS = [
  'What is machine learning?',
  'What is in this image?',
  'What error is shown in this screenshot?',
  'Explain the code in this image.',
]
