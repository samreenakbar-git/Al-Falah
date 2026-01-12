import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required. Please set it in your environment variables.")
}

// Allow full payload instead of only id
export function generateToken(payload: any): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined")
  }
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "30d",
  })
}

export function verifyToken(token: string): any {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined")
  }
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export function decodeToken(token: string): any {
  return jwt.decode(token)
}
