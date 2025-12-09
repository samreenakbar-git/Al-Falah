const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 

interface ApiResponse<T> {
  status: number
  data: T | null
  error: string | null
}

interface RequestOptions extends RequestInit {
  retries?: number
  timeout?: number
}

const DEFAULT_TIMEOUT = 30000 // 30 seconds
const MAX_RETRIES = 3

/**
 * Enhanced fetch with error handling, retries, timeout, and validation
 */
export async function apiCall<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { retries = MAX_RETRIES, timeout = DEFAULT_TIMEOUT, headers = {}, ...fetchOptions } = options

  const url = `${API_BASE_URL}${endpoint}`
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(` API Call (attempt ${attempt + 1}):`, url)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Validate response status
      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch {
          // Response is not JSON
        }

        const errorMessage = errorData?.message || `HTTP ${response.status}: ${response.statusText}`
        console.error(` API Error (${url}):`, errorMessage)

        // Retry on 5xx errors
        if (response.status >= 500 && attempt < retries) {
          console.log(` Retrying due to server error...`)
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }

        return {
          status: response.status,
          data: null,
          error: errorMessage,
        }
      }

      // Parse and validate response
      let data: T
      try {
        data = await response.json()
      } catch (e) {
        console.error(` Failed to parse JSON response from ${url}`)
        return {
          status: response.status,
          data: null,
          error: "Invalid response format",
        }
      }

      // Validate data structure
      if (!data || typeof data !== "object") {
        console.warn(` Unexpected data structure from ${url}:`, data)
      }

      console.log(` API Success (${url}):`, data)
      return {
        status: response.status,
        data,
        error: null,
      }
    } catch (error) {
      lastError = error as Error
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Don't retry on timeout or abort
      if (errorMessage.includes("abort") || errorMessage.includes("timeout")) {
        console.error(` Request timeout/abort for ${url}`)
        return {
          status: 0,
          data: null,
          error: "Request timeout. Please try again.",
        }
      }

      console.error(` API call failed (attempt ${attempt + 1}):`, errorMessage)

      // Retry on network errors
      if (attempt < retries) {
        console.log(` Retrying due to network error...`)
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
    }
  }

  const finalError = lastError?.message || "Network error. Please check your connection."
  console.error(` All retries exhausted for ${url}:`, finalError)
  return {
    status: 0,
    data: null,
    error: finalError,
  }
}

/**
 * Helper for POST requests with FormData support
 */
export async function apiPost<T = any>(
  endpoint: string,
  body: FormData | Record<string, any> | null = null,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const isFormData = body instanceof FormData
  const headers: Record<string, string> = isFormData ? {} : { "Content-Type": "application/json" }

  return apiCall<T>(endpoint, {
    ...options,
    method: "POST",
    headers,
    body: isFormData ? body : JSON.stringify(body),
  })
}

/**
 * Helper for GET requests
 */
export async function apiGet<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  return apiCall<T>(endpoint, {
    ...options,
    method: "GET",
  })
}

/**
 * Helper for PUT requests
 */
export async function apiPut<T = any>(
  endpoint: string,
  body: Record<string, any> | null = null,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return apiCall<T>(endpoint, {
    ...options,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export const API_BASE_URL_EXPORT = API_BASE_URL
