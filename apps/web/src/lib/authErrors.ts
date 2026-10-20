/** Error de Supabase Auth: lo que hace falta para elegir el mensaje. */
interface AuthErrorLike {
  code?: string
  status?: number
  message: string
}

/**
 * Supabase devuelve los errores en inglés ("email rate limit exceeded"...). Al crear la cuenta se
 * traducen los que pueden pasarle a alguien normal; el resto, con un mensaje genérico.
 */
export function signUpErrorMessage(error: AuthErrorLike): string {
  switch (error.code) {
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Ahora mismo no podemos enviar más emails de confirmación. Prueba dentro de un rato o entra con Google.'
    case 'weak_password':
      return 'La contraseña es demasiado débil: usa al menos 8 caracteres.'
    case 'email_address_invalid':
      return 'Ese email no parece válido. Revísalo.'
    case 'signup_disabled':
      return 'Ahora mismo no se pueden crear cuentas nuevas.'
    default:
      return 'No hemos podido crear la cuenta. Inténtalo de nuevo en un momento.'
  }
}
