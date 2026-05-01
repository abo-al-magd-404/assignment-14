import type { NextFunction, Request, Response } from "express";

interface IError extends Error {
  statusCode: number;
}

export const globalErrorHandler = (
  error: IError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (error.name == "MulterError") {
    error.statusCode = 400;
  }

  // Convert the stack string into a clean array of strings
  const formattedStack = error.stack
    ? error.stack
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : [];

  const status = error.statusCode || 500;

  return res.status(status).json({
    message: error.message || "Internal Server Error ✖",
    type: error.name,
    details: {
      cause: error.cause,
      stack: formattedStack,
      error,
    },
  });
};
