export type Role = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  text: string
  /** Object URL of an image the user attached to this message. */
  imageUrl?: string
}

export interface ChatHealth {
  status: string
  model: string
  groqConfigured: boolean
  maxImageSizeMb: number
}
