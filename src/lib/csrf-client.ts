// Client-side CSRF token management
export class CSRFClient {
  private token: string | null = null;
  private tokenHeader: string = 'x-csrf-token';

  // Fetch CSRF token from server
  async fetchToken(): Promise<string> {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();
      this.token = data.csrfToken;
      this.tokenHeader = data.tokenHeader;

      return this.token!;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }

  // Get current token (fetch if not available)
  async getToken(): Promise<string> {
    if (!this.token) {
      await this.fetchToken();
    }
    return this.token!;
  }

  // Get headers for API requests
  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      [this.tokenHeader]: token,
      'Content-Type': 'application/json',
    };
  }

  // Make authenticated API request
  async request(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = await this.getHeaders();
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      credentials: 'include',
    };

    return fetch(url, requestOptions);
  }

  // Clear token (for logout)
  clearToken(): void {
    this.token = null;
  }
}

// Global CSRF client instance
export const csrfClient = new CSRFClient();

// Utility function for making authenticated requests
export async function authenticatedRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  return csrfClient.request(url, options);
}
