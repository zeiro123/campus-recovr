import { NextFunction, Request, Response } from "express";
import sendResponse from "../global/response";
import { StatusCodes } from "http-status-codes";
import { blocksService } from "./blocks.service";

const blockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new Error("A userId is required");
    const result = await blocksService.blockUser(req.user.id, userId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "User blocked",
      data: result,
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};

const unblockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId || req.body?.userId;
    if (!userId) throw new Error("A userId is required");
    const result = await blocksService.unblockUser(req.user.id, userId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "User unblocked",
      data: result,
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};

const getBlockedUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await blocksService.getBlockedUsers(req.user.id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blocked users retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};

export const blocksController = { blockUser, unblockUser, getBlockedUsers };
