export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ResponseHelper {
  static success<T>(data: T, message: string = 'İşlem başarılı'): ApiResponse<T> {
    return {
      success: true,
      message,
      data
    };
  }

  static successWithPagination<T>(
    data: T[], 
    pagination: { page: number; limit: number; total: number }, 
    message: string = 'İşlem başarılı'
  ): ApiResponse<T[]> {
    return {
      success: true,
      message,
      data,
      pagination: {
        ...pagination,
        totalPages: Math.ceil(pagination.total / pagination.limit)
      }
    };
  }

  static error(message: string, error?: string): ApiResponse {
    return {
      success: false,
      message,
      error
    };
  }

  static notFound(resource: string = 'Kayıt'): ApiResponse {
    return {
      success: false,
      message: `${resource} bulunamadı`
    };
  }

  static badRequest(message: string = 'Geçersiz istek'): ApiResponse {
    return {
      success: false,
      message
    };
  }

  static unauthorized(message: string = 'Kimlik doğrulama gerekli'): ApiResponse {
    return {
      success: false,
      message
    };
  }

  static forbidden(message: string = 'Bu işlem için yetkiniz bulunmamaktadır'): ApiResponse {
    return {
      success: false,
      message
    };
  }

  static conflict(message: string = 'Kayıt zaten mevcut'): ApiResponse {
    return {
      success: false,
      message
    };
  }

  static serverError(message: string = 'Sunucu hatası', error?: string): ApiResponse {
    return {
      success: false,
      message,
      error
    };
  }
} 