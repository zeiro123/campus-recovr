import { NextFunction, Request, Response } from "express";
import sendResponse from "../global/response";
import { StatusCodes } from "http-status-codes";
import { notificationsService } from "./notifications.service";

const getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationsService.getMyNotifications(req.user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Notifications retrieved successfully",
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

const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationsService.markRead(req.params.id, req.user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Notification marked as read",
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

const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationsService.markAllRead(req.user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "All notifications marked as read",
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

export const notificationsController = { getMyNotifications, markRead, markAllRead };
