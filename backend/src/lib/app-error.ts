/**
 * Erro de negócio com status HTTP. Lance nos services; o error handler responde ao cliente.
 * `code` é opcional e serve para o frontend reagir a casos específicos.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
