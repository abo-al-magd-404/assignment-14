import { type Response } from "express";

export const successResponse = <T>({
  res,
  message = "Done",
  status = 200,
  data,
}: {
  res: Response;
  message?: string;
  status?: number;
  data?: T;
}) => {
  return res.status(status).json({ message, status, data });
};
