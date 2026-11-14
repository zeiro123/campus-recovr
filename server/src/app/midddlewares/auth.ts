import { NextFunction, Request, Response } from "express";
import { utils } from "../utils/utils";
import AppError from "../global/error";
import { StatusCodes } from "http-status-codes";

const auth = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = req.headers.authorization;
      if (!raw) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "You are not authorized!");
      }
      // Accept both "Bearer <token>" and a raw token (upstream clients send both).
      const token = raw.startsWith("Bearer ")
        ? raw.slice(7).trim()
        : raw.trim();
      const verifiedUser = utils.verifyToken(token);
      req.user = verifiedUser;

      if (!verifiedUser) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "You are not authorized!");
      }

      // if (requiredRoles.length && !requiredRoles.includes(verifiedUser.role)) {
      //   throw new AppError(StatusCodes.FORBIDDEN, "Forbidden");
      // }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export default auth;
